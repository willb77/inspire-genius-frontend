import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PublishPanel } from "../PublishPanel"
import { PrerequisiteGraph } from "../PrerequisiteGraph"
import { createCatalog, listCatalogs, publishCatalog } from "@/services/curriculum/curriculum.service"
import {
  catalogDetail,
  CLEAN_REPORT,
  COURSES,
  CYCLE_REPORT,
  http,
  PROGRAMS,
  renderCurriculum,
} from "@/test/curriculumFixtures"

jest.mock("@/services/curriculum/curriculum.service")
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const publish = publishCatalog as jest.MockedFunction<typeof publishCatalog>
const create = createCatalog as jest.MockedFunction<typeof createCatalog>
const m = <T extends (...a: never[]) => unknown>(f: T) => f as unknown as jest.MockedFunction<T>

beforeEach(() => jest.resetAllMocks())

describe("PublishPanel", () => {
  it("disables Publish while the server's publish check has problems, and shows them", () => {
    renderCurriculum(<PublishPanel detail={catalogDetail({}, CYCLE_REPORT)} />)
    expect(screen.getByRole("button", { name: /publish 2026-2027 v1/i })).toBeDisabled()
    expect(screen.getByText("ENG 112 → ENG 111 → ENG 112")).toBeInTheDocument()
  })

  it("publishes a clean draft", async () => {
    publish.mockResolvedValue({ ...catalogDetail().catalog, status: "published" })
    renderCurriculum(<PublishPanel detail={catalogDetail()} />)
    await userEvent.click(screen.getByRole("button", { name: /publish 2026-2027 v1/i }))
    await waitFor(() => expect(publish).toHaveBeenCalledWith("cat-1"))
  })

  it("renders a 409 refusal's report", async () => {
    publish.mockRejectedValue(http(409, { message: "This catalog can't be published yet.", report: CYCLE_REPORT }))
    renderCurriculum(<PublishPanel detail={catalogDetail({}, CLEAN_REPORT)} />)
    await userEvent.click(screen.getByRole("button", { name: /publish 2026-2027 v1/i }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("This catalog can't be published yet.")
    expect(within(alert).getByText("ENG 112 → ENG 111 → ENG 112")).toBeInTheDocument()
  })

  it("offers a new version (a copy) of a published catalog and opens it", async () => {
    create.mockResolvedValue({ ...catalogDetail().catalog, id: "cat-2", version: 2 })
    m(listCatalogs).mockResolvedValue([catalogDetail({ status: "published" }).catalog])
    renderCurriculum(<PublishPanel detail={catalogDetail({ status: "published" })} />)
    expect(screen.queryByRole("button", { name: /^publish/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Start a new version 2026-2027 v1" }))
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith("inst-1", { catalogYear: "2026-2027", fromCatalogId: "cat-1" })
    )
    expect(await screen.findByText("catalog page")).toBeInTheDocument()
  })

  it("renders a failed new version", async () => {
    create.mockRejectedValue(http(422, "Copy from a catalog of the same school."))
    renderCurriculum(<PublishPanel detail={catalogDetail({ status: "superseded" })} />)
    await userEvent.click(screen.getByRole("button", { name: "Start a new version" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Copy from a catalog of the same school.")
  })
})

describe("PrerequisiteGraph", () => {
  it("draws a program's courses and their prerequisites", async () => {
    const programs = [...PROGRAMS, { ...PROGRAMS[0], code: "P2", title: "Second", requirements: [] }]
    renderCurriculum(<PrerequisiteGraph programs={programs} courses={COURSES} />)
    expect(screen.getByRole("img", { name: "Prerequisite graph for P1" })).toBeInTheDocument()
    expect(within(screen.getByRole("list", { name: "Prerequisite links" })).getByRole("listitem")).toHaveTextContent(
      "MAT 122 needs MAT 121 (not itself in a requirement group)"
    )
    await userEvent.selectOptions(screen.getByLabelText("Program"), "P2")
    expect(screen.getByText(/requirement groups name no courses yet/)).toBeInTheDocument()
  })

  it("flags codes the catalog does not have, and a stored loop", () => {
    const loop = [
      { ...COURSES[0], prerequisites: [{ code: "MAT 122", kind: "prereq" as const, altGroup: 1, minGrade: null }] },
      COURSES[1],
    ]
    const program = { ...PROGRAMS[0], requirements: [{ ...PROGRAMS[0].requirements[0], courses: ["MAT 122", "NOPE 1"] }] }
    renderCurriculum(<PrerequisiteGraph programs={[program]} courses={loop} />)
    const alerts = screen.getAllByRole("alert")
    expect(alerts[0]).toHaveTextContent("Not in this catalog: NOPE 1")
    expect(alerts[1]).toHaveTextContent("requirement loop")
  })

  it("says what to do with no programs", () => {
    renderCurriculum(<PrerequisiteGraph programs={[]} courses={COURSES} />)
    expect(screen.getByText("Add a program to see its prerequisite graph.")).toBeInTheDocument()
  })
})
