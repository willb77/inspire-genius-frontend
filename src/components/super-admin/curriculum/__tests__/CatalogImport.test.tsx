import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CatalogImport } from "../CatalogImport"
import { importCatalog } from "@/services/curriculum/curriculum.service"
import { CLEAN_REPORT, CYCLE_REPORT, http, renderCurriculum } from "@/test/curriculumFixtures"

jest.mock("@/services/curriculum/curriculum.service")
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const run = importCatalog as jest.MockedFunction<typeof importCatalog>

beforeEach(() => jest.resetAllMocks())

const COURSES = "code,title,credits\nMAT 121,Algebra I,3\n"

async function typeCourses(text = COURSES) {
  const box = screen.getByLabelText("Courses CSV")
  await userEvent.clear(box)
  await userEvent.click(box)
  await userEvent.paste(text)
}

const importButton = () => screen.getByRole("button", { name: /import into this draft/i })

describe("CatalogImport — dry run before import", () => {
  it("keeps Import disabled until a dry run, and says why", async () => {
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    await typeCourses()
    expect(importButton()).toBeDisabled()
    expect(screen.getByText("Run a dry run first.")).toBeInTheDocument()
  })

  it("sends the dry run with dryRun: true and shows the cycle chain; Import stays disabled", async () => {
    run.mockResolvedValue({ dryRun: true, written: false, report: CYCLE_REPORT })
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    await typeCourses()
    await userEvent.click(screen.getByRole("button", { name: /run dry run/i }))
    const report = await screen.findByRole("region", { name: "Dry run" })
    expect(run).toHaveBeenCalledWith("cat-1", { coursesCsv: COURSES, programsCsv: "", dryRun: true })
    expect(within(report).getByText("ENG 112 → ENG 111 → ENG 112")).toBeInTheDocument()
    expect(within(report).getByText(/XYZ 999 — needed by course ENG 112/)).toBeInTheDocument()
    expect(within(report).getByText(/courses row 3: course ENG 113: no title/)).toBeInTheDocument()
    expect(within(report).getByText(/declares 60 credits/)).toBeInTheDocument()
    expect(importButton()).toBeDisabled()
    expect(screen.getByText(/Fix the problems in the report/)).toBeInTheDocument()
  })

  it("enables Import after a clean dry run, sends dryRun: false, and disables again if the text changes", async () => {
    run.mockResolvedValueOnce({ dryRun: true, written: false, report: CLEAN_REPORT })
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    await typeCourses()
    await userEvent.click(screen.getByRole("button", { name: /run dry run/i }))
    await waitFor(() => expect(importButton()).toBeEnabled())

    run.mockResolvedValueOnce({ dryRun: false, written: true, report: CLEAN_REPORT })
    await userEvent.click(importButton())
    await waitFor(() =>
      expect(run).toHaveBeenLastCalledWith("cat-1", { coursesCsv: COURSES, programsCsv: "", dryRun: false })
    )
    await waitFor(() => expect(importButton()).toBeDisabled())
  })

  it("disables Import when the files change after a clean dry run", async () => {
    run.mockResolvedValueOnce({ dryRun: true, written: false, report: CLEAN_REPORT })
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    await typeCourses()
    await userEvent.click(screen.getByRole("button", { name: /run dry run/i }))
    await waitFor(() => expect(importButton()).toBeEnabled())
    await userEvent.type(screen.getByLabelText("Courses CSV"), "MAT 122,Algebra II,3")
    expect(importButton()).toBeDisabled()
    expect(screen.getByText(/changed since the dry run/)).toBeInTheDocument()
  })

  it("renders a refused real import's report rather than swallowing it", async () => {
    run.mockResolvedValueOnce({ dryRun: true, written: false, report: CLEAN_REPORT })
    run.mockRejectedValueOnce(
      http(409, { message: "Nothing was written: fix the problems in the report first.", report: CYCLE_REPORT })
    )
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    await typeCourses()
    await userEvent.click(screen.getByRole("button", { name: /run dry run/i }))
    await waitFor(() => expect(importButton()).toBeEnabled())
    await userEvent.click(importButton())
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Nothing was written")
    expect(within(alert).getByText("ENG 112 → ENG 111 → ENG 112")).toBeInTheDocument()
  })

  it("shows a failed dry run's error", async () => {
    run.mockRejectedValueOnce(http(503, "Curriculum isn't set up on this tier yet (migration 051 is not applied)."))
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    await typeCourses()
    await userEvent.click(screen.getByRole("button", { name: /run dry run/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent("migration 051 is not applied")
  })

  it("refuses an empty dry run in the form", async () => {
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    await userEvent.click(screen.getByRole("button", { name: /run dry run/i }))
    expect(await screen.findByText("Paste or load at least one CSV file")).toBeInTheDocument()
    expect(run).not.toHaveBeenCalled()
  })

  it("loads a CSV file into its box", async () => {
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    const file = new File(["program_code,program_title,credential,total_credits\n"], "p.csv", { type: "text/csv" })
    Object.defineProperty(file, "text", { value: () => Promise.resolve("program_code,program_title\n") })
    await userEvent.upload(screen.getByLabelText("Load programs CSV file"), file)
    await waitFor(() => expect(screen.getByLabelText("Programs CSV")).toHaveValue("program_code,program_title\n"))
  })

  it("offers no Import on a published catalog (dry run only)", () => {
    renderCurriculum(<CatalogImport catalogId="cat-1" editable={false} />)
    expect(screen.queryByRole("button", { name: /import into this draft/i })).not.toBeInTheDocument()
    expect(screen.getByText(/start a new version to import into/)).toBeInTheDocument()
  })
})

describe("CatalogImport — sample files", () => {
  // The links point at public/; a missing file would come back from the CDN as
  // the app's index.html with a 200, so the files themselves are checked here.
  const SAMPLES = [
    { link: /sample courses csv/i, file: "sample_courses.csv", header: "code,title,credits," },
    { link: /sample programs csv/i, file: "sample_programs.csv", header: "program_code,program_title,credential,total_credits," },
  ]

  it.each(SAMPLES)("offers $file as a download", ({ link, file }) => {
    renderCurriculum(<CatalogImport catalogId="cat-1" editable />)
    const a = screen.getByRole("link", { name: link })
    expect(a).toHaveAttribute("href", `/samples/curriculum/${file}`)
    expect(a).toHaveAttribute("download", file)
  })

  it("shows the samples on a published catalog too", () => {
    renderCurriculum(<CatalogImport catalogId="cat-1" editable={false} />)
    expect(screen.getByRole("link", { name: /sample courses csv/i })).toBeInTheDocument()
  })

  it.each(SAMPLES)("ships $file in public/ with the import's header", ({ file, header }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- node fs in a jsdom test, read-only
    const fs = require("fs") as typeof import("fs")
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- as above
    const path = require("path") as typeof import("path")
    const text = fs.readFileSync(path.join(process.cwd(), "public", "samples", "curriculum", file), "utf8")
    expect(text.startsWith(header)).toBe(true)
    expect(text.split("\n").filter((l) => l.trim()).length).toBeGreaterThan(1)
  })
})
