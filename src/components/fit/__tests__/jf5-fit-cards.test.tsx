/**
 * @jest-environment jsdom
 *
 * JF-5 — the fit card graphic replaces the radar on the Careers and Jobs
 * breakdown, only on a priority-scored read (`scoring: "priority-9"`, which
 * blueprint-service sets only when the job_fit_v2 switch applies). Every other
 * read draws today's radar. Cards are built from rating differences, carry a
 * text-and-icon status marker, and every definition is reachable by keyboard.
 */
import { render, screen, within } from "@testing-library/react"
import type { FitDetail, PerDimensionFit } from "@/types/job-fit"

const radarProps = jest.fn()
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: (props: unknown) => {
    radarProps(props)
    return <div data-testid="radar" />
  },
}))

import { FitBreakdown } from "@/pages/job-fit/FitBreakdown"
import {
  PRIORITY_SCORING,
  fitCardGroups,
  fitCardStatus,
  isPriorityScored,
} from "@/components/fit/FitCardsModel"
import { dimensionDefinition, FIT_CARD_STATUS_DEFINITIONS } from "@/constants/fit-definitions"

type Row = PerDimensionFit & { priority?: boolean }

function row(
  category: PerDimensionFit["category"],
  dimensionId: number,
  dimensionName: string,
  candidateScore: number | null,
  benchmarkScore: number,
  priority?: boolean,
): Row {
  const measured = candidateScore !== null
  return {
    category,
    dimensionId,
    dimensionName,
    candidateScore,
    benchmarkScore,
    gap: measured ? (candidateScore as number) - benchmarkScore : null,
    coaching: "",
    measured,
    ...(priority === undefined ? {} : { priority }),
  }
}

function detail(perDimension: Row[], scoring?: string): FitDetail {
  return {
    jobId: "j1",
    roleTitle: "Research Analyst",
    tier: "strong-fit",
    baseTier: "strong-fit",
    totalVariation: 40,
    fitScore: 80,
    perDimension,
    criticalGaps: [],
    coachingGaps: [],
    overdoneFlags: [],
    interviewSelfAdvocacy: [],
    methodologyNote: "",
    ...(scoring === undefined ? {} : { scoring }),
  } as unknown as FitDetail
}

const PRIORITY_ROWS: Row[] = [
  row("core-trait", 2, "Emotional Stability", 50, 70, true), // −20 growth
  row("behavior", 7, "Finishing", 72, 70, true), // +2 match
  row("aptitude", 2, "Investigative & Analytical", 61, 66, true), // −5 close
  row("behavior", 1, "Innovating", null, 60, true), // not measured
  row("behavior", 3, "Supporting", 40, 80, false), // not a priority dimension
  row("aptitude", 1, "Practical & Mechanical", 30, 30), // 22-dim style row, no flag
]

beforeEach(() => radarProps.mockClear())

describe("switch off — today's radar, unchanged", () => {
  test("no `scoring` field (switch off, missing row or failed read server-side): radar, no cards", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS)} />)
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    expect(screen.queryByTestId("fit-radar-overlay")).not.toBeInTheDocument()
    expect(radarProps).toHaveBeenCalledTimes(1)
  })

  test("any other `scoring` value: radar", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, "full-22")} />)
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    expect(screen.queryByTestId("fit-radar-overlay")).not.toBeInTheDocument()
  })

  test("priority-scored but no row flagged priority: radar, never an empty card section", () => {
    const rows = PRIORITY_ROWS.map((r) => ({ ...r, priority: false }))
    render(<FitBreakdown data={detail(rows, PRIORITY_SCORING)} />)
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    expect(screen.queryByTestId("fit-radar-overlay")).not.toBeInTheDocument()
  })

  test("the model agrees: null for every off case", () => {
    expect(fitCardGroups(detail(PRIORITY_ROWS))).toBeNull()
    expect(fitCardGroups(detail(PRIORITY_ROWS, "priority-22"))).toBeNull()
    expect(fitCardGroups(detail([], PRIORITY_SCORING))).toBeNull()
    expect(isPriorityScored(detail(PRIORITY_ROWS))).toBe(false)
    expect(isPriorityScored(detail(PRIORITY_ROWS, PRIORITY_SCORING))).toBe(true)
  })
})

/** The legend row for one dimension — scoped to the legend, since the table below repeats names. */
function legendRow(name: string): HTMLElement {
  return within(screen.getByTestId("fit-radar-legend")).getByText(name, { exact: false }).closest("li") as HTMLElement
}

describe("switch on — behaviour map overlay and legend", () => {
  test("replaces the 22-dimension radar; one axis and one legend row per priority dimension, grouped in order", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    expect(screen.queryByTestId("radar")).not.toBeInTheDocument()
    expect(radarProps).not.toHaveBeenCalled()
    expect(screen.getByTestId("fit-radar")).toBeInTheDocument()

    const legend = screen.getByTestId("fit-radar-legend")
    expect(within(legend).getAllByTestId("fit-radar-legend-item")).toHaveLength(4)
    const groups = within(legend).getAllByRole("region")
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Behavior preferences",
      "Work aptitudes",
      "Core traits",
    ])
    expect(within(legend).queryByText("Supporting")).not.toBeInTheDocument()
    expect(within(legend).queryByText("Practical & Mechanical")).not.toBeInTheDocument()
  })

  test("the job polygon has every axis; the person polygon only the measured ones (never a 0)", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const pts = (id: string) => (screen.getByTestId(id).getAttribute("points") ?? "").trim().split(" ")
    expect(pts("fit-radar-job")).toHaveLength(4)
    expect(pts("fit-radar-you")).toHaveLength(3)
    expect(screen.getAllByTestId("fit-radar-you-dot")).toHaveLength(3)
  })

  test("plotted radius equals the legend number (job 70 on a 100 scale)", () => {
    render(<FitBreakdown data={detail([
      row("behavior", 7, "Finishing", 100, 100, true),
      row("behavior", 1, "Innovating", 50, 50, true),
      row("aptitude", 2, "Investigative & Analytical", 0, 0, true),
    ], PRIORITY_SCORING)} />)
    // First axis points straight up: value 100 → centre 180, radius 118 → y = 62.
    const first = (screen.getByTestId("fit-radar-job").getAttribute("points") as string).split(" ")[0]
    expect(first).toBe("180.0,62.0")
  })

  test("each legend row shows the job's rating, the person's and the difference — not a %", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const card = legendRow("Emotional Stability")
    expect(within(card).getByText("This job").nextSibling).toHaveTextContent("70")
    expect(within(card).getByText("You").nextSibling).toHaveTextContent("50")
    expect(within(card).getByText("Difference").nextSibling).toHaveTextContent("-20")
    expect(card).not.toHaveTextContent("%")
  })

  test("the tile text is visible in the legend: definitions, group lines and status key", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    expect(legendRow("Finishing")).toHaveTextContent(dimensionDefinition("behavior", 7, "Finishing") as string)
    const legend = screen.getByTestId("fit-radar-legend")
    expect(legend).toHaveTextContent(/handle work over time/)
    const key = screen.getByTestId("fit-radar-status-key")
    for (const def of Object.values(FIT_CARD_STATUS_DEFINITIONS)) expect(key).toHaveTextContent(def)
  })

  test("status is text and icon, never colour alone", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const status = (name: string) => within(legendRow(name)).getByTestId("fit-radar-status")
    expect(status("Finishing")).toHaveTextContent("Match")
    expect(status("Investigative & Analytical")).toHaveTextContent("Close")
    expect(status("Emotional Stability")).toHaveTextContent("Growth area")
    for (const name of ["Finishing", "Investigative & Analytical", "Emotional Stability"]) {
      expect(status(name).previousElementSibling?.tagName.toLowerCase()).toBe("svg")
    }
  })

  test("a priority dimension never measured: no difference, no status, a note, and left off the person shape", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const card = legendRow("Innovating")
    expect(card).toHaveTextContent("Not measured")
    expect(within(card).queryByText("Difference")).not.toBeInTheDocument()
    expect(within(card).queryByTestId("fit-radar-status")).not.toBeInTheDocument()
    expect(screen.getByText(/left off your shape rather than drawn as zero/)).toBeInTheDocument()
  })

  test("fewer than three priority dimensions: legend only, no degenerate chart", () => {
    render(<FitBreakdown data={detail([row("behavior", 7, "Finishing", 72, 70, true), row("aptitude", 2, "Investigative & Analytical", 61, 66, true)], PRIORITY_SCORING)} />)
    expect(screen.queryByTestId("fit-radar")).not.toBeInTheDocument()
    // No orphaned chart column: series key and note go with the chart, and the grid keeps one track.
    expect(screen.queryByTestId("fit-radar-chart-column")).not.toBeInTheDocument()
    expect(screen.queryByTestId("fit-radar-series-key")).not.toBeInTheDocument()
    expect(screen.getByTestId("fit-radar-legend").parentElement?.className).not.toMatch(/360px/)
    expect(screen.getAllByTestId("fit-radar-legend-item")).toHaveLength(2)
  })
})

describe("status from the rating difference", () => {
  test.each([
    [25, "match"],
    [0, "match"],
    [-1, "close"],
    [-10, "close"],
    [-11, "growth"],
    [-40, "growth"],
  ])("difference %p → %p", (diff, status) => {
    expect(fitCardStatus(diff)).toBe(status)
  })

  test("the card's status follows its shown (rounded) numbers", () => {
    const groups = fitCardGroups(
      detail([row("behavior", 7, "Finishing", 59.6, 70.4, true)], PRIORITY_SCORING),
    )
    const item = groups?.[0].items[0]
    expect(item?.personRating).toBe(60)
    expect(item?.jobRating).toBe(70)
    expect(item?.difference).toBe(-10)
    expect(item?.status).toBe("close")
  })
})

describe("definition lookup", () => {
  test("by name within the category, case-insensitive", () => {
    expect(dimensionDefinition("behavior", 99, "finishing")).toMatch(/Attention to detail/)
  })
  test("an unknown name is null, never another dimension's text by id", () => {
    expect(dimensionDefinition("behavior", 7, "Something Else")).toBeNull()
  })
  test("the id is used only when no name was sent", () => {
    expect(dimensionDefinition("behavior", 7, "")).toMatch(/Attention to detail/)
  })
  test("a legend row whose name the catalogue does not know shows the name without a definition", () => {
    render(
      <FitBreakdown
        data={detail([row("behavior", 9, "Unlisted", 50, 50, true), row("behavior", 7, "Finishing", 72, 70, true), row("aptitude", 2, "Investigative & Analytical", 61, 66, true)], PRIORITY_SCORING)}
      />,
    )
    const row_ = legendRow("Unlisted")
    expect(row_).toBeInTheDocument()
    expect(row_.querySelector("p")).toBeNull()
  })
})
