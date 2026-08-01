/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react"

import GoalsPage from "../GoalsPage"
import AlignmentPage, {
  AlignmentReportView,
  AtTensionRow,
  ConflictCallout,
  SupportedGoalRow,
  type AlignmentReport,
} from "../AlignmentPage"
import SalaryPage, { SalaryRangeCard, type SalaryRange } from "../SalaryPage"

/* ── Router ──────────────────────────────────────────────────────────────────
 * All three pages navigate imperatively (no <Link>), so a `useNavigate` stub is
 * the whole router surface they touch — cheaper and more precise than wrapping
 * each render in a MemoryRouter and inspecting history. */
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }))

/* ── Journey hooks (GoalsPage only) ───────────────────────────────────────── */
const mockAdvance = jest.fn()
let journeyResult: {
  data?: { stageStatus: Record<string, string> }
  isLoading: boolean
  isError: boolean
} = { data: undefined, isLoading: false, isError: false }

jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useJourney: () => journeyResult,
  useAdvanceJourney: () => ({ mutate: mockAdvance, isPending: false }),
}))

beforeEach(() => {
  mockNavigate.mockReset()
  mockAdvance.mockReset()
  journeyResult = { data: undefined, isLoading: false, isError: false }
})

const withStage5 = (state: string) => {
  journeyResult = {
    data: { stageStatus: { "5": state } },
    isLoading: false,
    isError: false,
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */

describe("GoalsPage (stage 5) — a door into Summit, not a second goal system", () => {
  test("sends the user into the existing Summit interview", () => {
    // The load-bearing decision on this page. If someone later replaces this
    // handoff with an inline interview, this test should be the thing that
    // makes them justify it.
    render(<GoalsPage />)

    fireEvent.click(
      screen.getByRole("button", { name: /start the goal interview/i })
    )

    expect(mockNavigate).toHaveBeenCalledWith("/summit/discovery")
  })

  test("records the handoff on the journey when the stage was untouched", () => {
    render(<GoalsPage />)

    fireEvent.click(
      screen.getByRole("button", { name: /start the goal interview/i })
    )

    expect(mockAdvance).toHaveBeenCalledWith({
      stageId: "5",
      state: "in_progress",
    })
  })

  test("does not re-mark a stage already under way", () => {
    withStage5("in_progress")
    render(<GoalsPage />)

    expect(
      screen.getByRole("button", { name: /continue the goal interview/i })
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: /continue the goal interview/i })
    )
    expect(mockAdvance).not.toHaveBeenCalled()
  })

  test("offers a way back to goals already captured", () => {
    render(<GoalsPage />)
    fireEvent.click(
      screen.getByRole("button", { name: /see the goals i have so far/i })
    )
    expect(mockNavigate).toHaveBeenCalledWith("/summit/goals")
  })

  test("lets the person say when they're done, and stops asking once they have", () => {
    const { unmount } = render(<GoalsPage />)
    fireEvent.click(screen.getByRole("button", { name: /mark this step done/i }))
    expect(mockAdvance).toHaveBeenCalledWith({ stageId: "5", state: "complete" })
    unmount()

    withStage5("complete")
    render(<GoalsPage />)
    expect(screen.getByText("Done")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /mark this step done/i })
    ).not.toBeInTheDocument()
  })

  test("explains that goals here carry the reason underneath them", () => {
    // The product point. Copy can be reworded; the promise cannot quietly
    // become "list your objectives".
    render(<GoalsPage />)
    expect(
      screen.getByText(/goals with the reason underneath them/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/up to five times, and no further/i)).toBeInTheDocument()
  })

  test("still renders the handoff when the progress read fails", () => {
    journeyResult = { data: undefined, isLoading: false, isError: true }
    render(<GoalsPage />)

    expect(
      screen.getByRole("button", { name: /start the goal interview/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/couldn't read your progress/i)).toBeInTheDocument()
  })
})

/* ══════════════════════════════════════════════════════════════════════════ */

describe("AlignmentPage (stage 6) — honest until Phase 3 lands", () => {
  test("says what the step does before admitting it isn't ready", () => {
    render(<AlignmentPage />)
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /do my goals and my wiring agree/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/what this step does/i)).toBeInTheDocument()
    expect(screen.getByText(/this step isn't ready yet/i)).toBeInTheDocument()
  })

  test("shows no analysis at all rather than a plausible-looking one", () => {
    // The failure this pins: someone adding sample rows "just to show the
    // layout". A fabricated tension about a real person's goals is not a
    // placeholder, it's a wrong answer.
    render(<AlignmentPage />)
    expect(
      screen.queryByText(/goals your wiring is behind/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/goals that will cost you something/i)
    ).not.toBeInTheDocument()
  })

  test("frames tension as information, not a verdict", () => {
    render(<AlignmentPage />)
    expect(
      screen.getByText(/a tension is information about a trade-off, not a judgement/i)
    ).toBeInTheDocument()
  })

  test("points at the two steps this one reads from", () => {
    render(<AlignmentPage />)

    fireEvent.click(screen.getByRole("button", { name: /set my goals/i }))
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/direction-setting/goals")

    fireEvent.click(screen.getByRole("button", { name: /see who i am/i }))
    expect(mockNavigate).toHaveBeenCalledWith(
      "/vertical/direction-setting/portrait"
    )
  })
})

describe("AlignmentPage presentational pieces — the Phase 3 seam", () => {
  test("a supported goal names the goal and what backs it", () => {
    render(
      <ul>
        <SupportedGoalRow
          item={{
            goal: "Lead a small team within two years",
            supportedBy: "You read a room quickly and people tell you things",
            note: "Lean on this rather than on being the loudest voice.",
          }}
        />
      </ul>
    )
    expect(
      screen.getByText("Lead a small team within two years")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/you read a room quickly/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/lean on this rather than/i)).toBeInTheDocument()
  })

  test("an at-tension row gives the cost, what helps, and no verdict", () => {
    render(
      <ul>
        <AtTensionRow
          item={{
            goal: "Move into enterprise sales",
            runsAgainst: "You recharge on your own and cold contact drains you",
            cost: "Most days will end with less left in the tank than you're used to",
            whatHelps: "Blocking recovery time after call-heavy days",
          }}
        />
      </ul>
    )
    expect(screen.getByText("Move into enterprise sales")).toBeInTheDocument()
    expect(screen.getByText(/cold contact drains you/i)).toBeInTheDocument()
    expect(screen.getByText(/less left in the tank/i)).toBeInTheDocument()
    expect(screen.getByText(/blocking recovery time/i)).toBeInTheDocument()
    // The non-judgement line is per-row on purpose — someone reading one row
    // about their own goal needs it in front of them, not in a page preamble.
    expect(
      screen.getByText(/this doesn't mean don't\. it means go in knowing the price/i)
    ).toBeInTheDocument()
  })

  test("a conflict is put as a question for the person, not a recommendation", () => {
    render(
      <ConflictCallout
        item={{
          goals: ["Earn more within a year", "Retrain into design"],
          explanation:
            "Retraining usually means a pay dip first, and a year is tight for both.",
          question: "Which of these can wait eighteen months without it hurting?",
        }}
      />
    )
    expect(screen.getByText(/earn more within a year/i)).toBeInTheDocument()
    expect(screen.getByText(/retrain into design/i)).toBeInTheDocument()
    expect(
      screen.getByText(/which of these can wait eighteen months/i)
    ).toBeInTheDocument()
  })

  test("the report view renders every section once data exists", () => {
    const report: AlignmentReport = {
      supported: [
        { goal: "Finish the certificate", supportedBy: "You follow through" },
      ],
      tensions: [
        {
          goal: "Present at the all-hands",
          runsAgainst: "Speaking to a crowd costs you",
          cost: "A tense week beforehand",
          whatHelps: "Rehearsing it out loud with one person first",
        },
      ],
      conflicts: [
        {
          goals: ["Stay local", "Take the senior role"],
          explanation: "The senior roles in this field cluster in two cities.",
          question: "Is staying local a preference or a fixed point?",
        },
      ],
    }
    render(<AlignmentReportView report={report} />)

    expect(
      screen.getByRole("heading", { name: /goals your wiring is behind/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /goals that will cost you something/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /two things you want that pull apart/i })
    ).toBeInTheDocument()
    expect(screen.getByText("Finish the certificate")).toBeInTheDocument()
    expect(screen.getByText("Present at the all-hands")).toBeInTheDocument()
    expect(screen.getByText(/is staying local a preference/i)).toBeInTheDocument()
  })

  test("an empty tensions list reads as a result, not as a blank", () => {
    render(
      <AlignmentReportView
        report={{ supported: [], tensions: [], conflicts: [] }}
      />
    )
    expect(
      screen.getByText(/none found\. that's a real result, not a blank/i)
    ).toBeInTheDocument()
  })
})

/* ══════════════════════════════════════════════════════════════════════════ */

describe("SalaryPage (stage 4) — honest until Phase 4 lands", () => {
  test("states the step's purpose and admits the data isn't connected", () => {
    render(<SalaryPage />)
    expect(
      screen.getByRole("heading", { level: 1, name: /what does that pay/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/this step isn't ready yet/i)).toBeInTheDocument()
  })

  test("shows no figures at all while the adapter is missing", () => {
    // Not even a greyed-out example. A placeholder salary gets believed.
    const { container } = render(<SalaryPage />)
    expect(container.textContent).not.toMatch(/\$\s?\d/)
  })

  test("commits to a range with provenance, up front", () => {
    render(<SalaryPage />)
    expect(screen.getByText(/never a single number/i)).toBeInTheDocument()
    expect(
      screen.getByText(/where it came from and when it was collected/i)
    ).toBeInTheDocument()
  })

  test("routes to the step it reads from", () => {
    render(<SalaryPage />)
    fireEvent.click(screen.getByRole("button", { name: /look at career areas/i }))
    expect(mockNavigate).toHaveBeenCalledWith(
      "/vertical/direction-setting/careers"
    )
  })
})

describe("SalaryRangeCard — the point-estimate guard", () => {
  const sound: SalaryRange = {
    low: 42000,
    median: 55000,
    high: 71000,
    source: "US Bureau of Labor Statistics, OES",
    asOf: "2026-05",
    region: "United States",
  }

  test("shows all three bounds, never just the middle one", () => {
    render(<SalaryRangeCard role="Operations analyst" range={sound} />)
    expect(screen.getByText("$42,000")).toBeInTheDocument()
    expect(screen.getByText("$55,000")).toBeInTheDocument()
    expect(screen.getByText("$71,000")).toBeInTheDocument()
    expect(screen.getByText("Lower end")).toBeInTheDocument()
    expect(screen.getByText("Upper end")).toBeInTheDocument()
  })

  test("prints the source and the vintage next to the numbers", () => {
    render(<SalaryRangeCard role="Operations analyst" range={sound} />)
    expect(
      screen.getByText(/source: us bureau of labor statistics, oes · as of may 2026/i)
    ).toBeInTheDocument()
  })

  test("describes the range for screen readers as a range", () => {
    render(<SalaryRangeCard role="Operations analyst" range={sound} />)
    expect(
      screen.getByRole("img", {
        name: /pay range for operations analyst: \$42,000 to \$71,000, midpoint \$55,000/i,
      })
    ).toBeInTheDocument()
  })

  test("refuses to print numbers that arrived without a source", () => {
    // Types stop at the network boundary; this is the runtime half of the guard.
    render(
      <SalaryRangeCard
        role="Operations analyst"
        range={{ ...sound, source: "  " }}
      />
    )
    expect(screen.queryByText("$55,000")).not.toBeInTheDocument()
    expect(
      screen.getByText(/without a source or a date/i)
    ).toBeInTheDocument()
  })

  test("refuses to print numbers that arrived without a date", () => {
    render(
      <SalaryRangeCard role="Operations analyst" range={{ ...sound, asOf: "" }} />
    )
    expect(screen.queryByText("$42,000")).not.toBeInTheDocument()
    expect(screen.getByText(/without a source or a date/i)).toBeInTheDocument()
  })

  test("refuses a range whose bounds don't line up", () => {
    render(
      <SalaryRangeCard
        role="Operations analyst"
        range={{ ...sound, median: 90000 }}
      />
    )
    expect(screen.queryByText("$42,000")).not.toBeInTheDocument()
    expect(screen.getByText(/don't line up/i)).toBeInTheDocument()
  })

  test("honours a non-default currency", () => {
    render(
      <SalaryRangeCard
        role="Operations analyst"
        range={{ ...sound, currency: "GBP" }}
      />
    )
    expect(screen.getByText("£42,000")).toBeInTheDocument()
  })
})
