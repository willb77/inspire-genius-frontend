/**
 * @jest-environment jsdom
 *
 * JF-5 — the fit card graphic replaces the radar on the Careers and Jobs
 * breakdown, only on a priority-scored read (`scoring: "priority-9"`, which
 * blueprint-service sets only when the job_fit_v2 switch applies). Every other
 * read draws today's radar. Cards are built from rating differences, carry a
 * text-and-icon status marker, and every definition is reachable by keyboard.
 */
import { render, screen, within, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

/** The card for one dimension — scoped to the graphic, since the table below repeats names. */
function cardFor(name: string): HTMLElement {
  return within(screen.getByTestId("fit-cards")).getByText(name).closest("li") as HTMLElement
}

describe("switch off — today's radar, unchanged", () => {
  test("no `scoring` field (switch off, missing row or failed read server-side): radar, no cards", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS)} />)
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    expect(screen.queryByTestId("fit-cards")).not.toBeInTheDocument()
    expect(radarProps).toHaveBeenCalledTimes(1)
  })

  test("any other `scoring` value: radar", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, "full-22")} />)
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    expect(screen.queryByTestId("fit-cards")).not.toBeInTheDocument()
  })

  test("priority-scored but no row flagged priority: radar, never an empty card section", () => {
    const rows = PRIORITY_ROWS.map((r) => ({ ...r, priority: false }))
    render(<FitBreakdown data={detail(rows, PRIORITY_SCORING)} />)
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    expect(screen.queryByTestId("fit-cards")).not.toBeInTheDocument()
  })

  test("the model agrees: null for every off case", () => {
    expect(fitCardGroups(detail(PRIORITY_ROWS))).toBeNull()
    expect(fitCardGroups(detail(PRIORITY_ROWS, "priority-22"))).toBeNull()
    expect(fitCardGroups(detail([], PRIORITY_SCORING))).toBeNull()
    expect(isPriorityScored(detail(PRIORITY_ROWS))).toBe(false)
    expect(isPriorityScored(detail(PRIORITY_ROWS, PRIORITY_SCORING))).toBe(true)
  })
})

describe("switch on — the card graphic", () => {
  test("replaces the radar; one card per priority dimension, grouped in order", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    expect(screen.queryByTestId("radar")).not.toBeInTheDocument()
    expect(radarProps).not.toHaveBeenCalled()

    const cards = screen.getByTestId("fit-cards")
    expect(within(cards).getAllByTestId("fit-card")).toHaveLength(4)
    const groups = within(cards).getAllByRole("region")
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Behavior preferences",
      "Work aptitudes",
      "Core traits",
    ])
    // The non-priority rows are not cards.
    expect(within(cards).queryByText("Supporting")).not.toBeInTheDocument()
    expect(within(cards).queryByText("Practical & Mechanical")).not.toBeInTheDocument()
  })

  test("each card shows the job's rating, the person's and the difference — not a %", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const card = cardFor("Emotional Stability")
    expect(within(card).getByText("This job").nextSibling).toHaveTextContent("70")
    expect(within(card).getByText("You").nextSibling).toHaveTextContent("50")
    expect(within(card).getByText("Difference").nextSibling).toHaveTextContent("-20")
    expect(card).not.toHaveTextContent("%")
  })

  test("status is text and icon, never colour alone", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const status = (name: string) =>
      within(cardFor(name)).getByTestId("fit-card-status")
    expect(status("Finishing")).toHaveTextContent("Match")
    expect(status("Investigative & Analytical")).toHaveTextContent("Close")
    expect(status("Emotional Stability")).toHaveTextContent("Growth area")
    for (const name of ["Finishing", "Investigative & Analytical", "Emotional Stability"]) {
      expect(status(name).previousElementSibling?.tagName.toLowerCase()).toBe("svg")
    }
  })

  test("a priority dimension never measured: no difference and no status", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const card = cardFor("Innovating")
    expect(card).toHaveTextContent("Not measured")
    expect(within(card).queryByText("Difference")).not.toBeInTheDocument()
    expect(within(card).queryByTestId("fit-card-status")).not.toBeInTheDocument()
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

describe("definitions — hover, focus and tap", () => {
  test("keyboard: Tab reaches the dimension name, its definition opens and is its description", async () => {
    const user = userEvent.setup()
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const term = screen.getByRole("button", { name: "Finishing" })
    const def = dimensionDefinition("behavior", 7, "Finishing") as string

    // Tab until the term is focused — proves it is in the tab order.
    for (let i = 0; i < 20 && document.activeElement !== term; i++) await user.tab()
    expect(term).toHaveFocus()
    expect(term).toHaveAccessibleDescription(def)
    expect(screen.getByRole("tooltip")).toHaveTextContent(def)
    expect(term).toHaveAttribute("aria-expanded", "true")

    await user.keyboard("{Escape}")
    expect(term).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

    await user.tab()
    expect(term).not.toHaveFocus()
  })

  test("every status marker and group heading is a keyboard-reachable definition", async () => {
    const user = userEvent.setup()
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const marker = screen.getByRole("button", { name: "Growth area" })
    for (let i = 0; i < 30 && document.activeElement !== marker; i++) await user.tab()
    expect(marker).toHaveFocus()
    expect(marker).toHaveAccessibleDescription(FIT_CARD_STATUS_DEFINITIONS.growth)
    expect(screen.getByRole("button", { name: "Core traits" })).toHaveAccessibleDescription(
      /handle work over time/,
    )
  })

  test("hover opens and leaving closes", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const term = screen.getByRole("button", { name: "Finishing" })
    fireEvent.mouseEnter(term)
    expect(term).toHaveAttribute("aria-expanded", "true")
    fireEvent.mouseLeave(term)
    expect(term).toHaveAttribute("aria-expanded", "false")
  })

  test("tap opens, a second tap closes, blur closes", () => {
    render(<FitBreakdown data={detail(PRIORITY_ROWS, PRIORITY_SCORING)} />)
    const term = screen.getByRole("button", { name: "Finishing" })
    fireEvent.click(term)
    expect(term).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(term)
    expect(term).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(term)
    fireEvent.blur(term)
    expect(term).toHaveAttribute("aria-expanded", "false")
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
  test("a card whose name the catalogue does not know shows the name without a definition", () => {
    render(
      <FitBreakdown
        data={detail([row("behavior", 9, "Unlisted", 50, 50, true)], PRIORITY_SCORING)}
      />,
    )
    expect(cardFor("Unlisted")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Unlisted" })).not.toBeInTheDocument()
  })
})
