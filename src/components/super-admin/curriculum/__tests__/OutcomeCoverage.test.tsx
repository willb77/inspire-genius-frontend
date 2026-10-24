import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OutcomeCoverage } from "../OutcomeCoverage"
import { getOutcomeCoverage } from "@/services/curriculum/curriculum.service"
import { http, renderCurriculum } from "@/test/curriculumFixtures"
import type { OutcomeCoverage as Coverage } from "@/types/curriculum"

jest.mock("@/services/curriculum/curriculum.service")
const coverage = getOutcomeCoverage as jest.MockedFunction<typeof getOutcomeCoverage>

const CATALOG = { id: "cat-1", status: "draft" as const, catalogYear: "2026-2027", version: 1 }
const of = (over: Partial<Coverage>): Coverage => ({
  catalog: CATALOG,
  programCount: 3,
  withOutcomes: 1,
  withoutOutcomes: [
    { id: "p2", code: "P2", title: "Second Program" },
    { id: "p3", code: "P3", title: "Third Program" },
  ],
  complete: false,
  ...over,
})

beforeEach(() => jest.resetAllMocks())

describe("OutcomeCoverage", () => {
  it("lists the programs with no outcome, with the counts", async () => {
    coverage.mockResolvedValue(of({}))
    renderCurriculum(<OutcomeCoverage catalogId="cat-1" />)
    expect(await screen.findByText("1 of 3 programs have at least one career outcome.")).toBeInTheDocument()
    const table = screen.getByRole("table", { name: "Programs with no outcome" })
    expect(within(table).getByText("P2")).toBeInTheDocument()
    expect(within(table).getByText("Third Program")).toBeInTheDocument()
    expect(coverage).toHaveBeenCalledWith("cat-1")
  })

  it("points a published catalog at a new version", async () => {
    coverage.mockResolvedValue(of({ catalog: { ...CATALOG, status: "published" } }))
    renderCurriculum(<OutcomeCoverage catalogId="cat-1" />)
    expect(await screen.findByText(/Programs → Outcomes on a new version/)).toBeInTheDocument()
  })

  it("says when every program is covered, and when there are no programs", async () => {
    coverage.mockResolvedValue(of({ programCount: 2, withOutcomes: 2, withoutOutcomes: [], complete: true }))
    const { unmount } = renderCurriculum(<OutcomeCoverage catalogId="cat-1" />)
    expect(await screen.findByText("Every program in this catalog has at least one outcome.")).toBeInTheDocument()
    unmount()
    coverage.mockResolvedValue(of({ programCount: 0, withOutcomes: 0, withoutOutcomes: [], complete: false }))
    renderCurriculum(<OutcomeCoverage catalogId="cat-1" />)
    expect(await screen.findByText(/no programs yet/)).toBeInTheDocument()
  })

  it("renders the server's refusal and retries", async () => {
    coverage.mockRejectedValueOnce(http(503, "The curriculum tables are not set up on this tier."))
    coverage.mockResolvedValueOnce(of({}))
    renderCurriculum(<OutcomeCoverage catalogId="cat-1" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("The curriculum tables are not set up on this tier.")
    await userEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(await screen.findByText(/1 of 3 programs/)).toBeInTheDocument()
  })
})
