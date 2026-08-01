/**
 * @jest-environment jsdom
 *
 * Direction Setting stages 7–10.
 *
 * Hooks are mocked (never axios), so every branch a real user can land on is
 * rendered here: matches present, matches empty, matching switched off, the
 * request failing, and the plan page's not-built-yet shell.
 *
 * The empty-matches case gets the most attention on purpose. Matching runs
 * against published role benchmarks, and the shared library is still empty —
 * so someone arriving without an employer, which is the audience this journey
 * exists for, sees exactly that state. It has to explain itself, offer a real
 * next step, and never read as an error or invent a match to fill the space.
 */
import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { FitDetail, FitMatch } from "@/types/job-fit"
import type { MatchesResult } from "@/hooks/direction-setting/useMatches"

/* ── Hook mocks ── */
const mockUseMatches = jest.fn()
const mockUseFitDetail = jest.fn()
// Args are forwarded so the tests can pin which scoring method the page asks for.
jest.mock("@/hooks/direction-setting/useMatches", () => ({
  useMatches: (...args: unknown[]) => mockUseMatches(...args),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: (...args: unknown[]) => mockUseFitDetail(...args),
}))

import MatchesPage from "../MatchesPage"
import PlanPage, { PlanSequence, MilestoneList, RoiSummary } from "../PlanPage"

// The pure envelope reader is exercised against the real module — it is the one
// piece of the hook that decides "empty" vs "switched off".
const { normalizeMatches } = jest.requireActual(
  "@/hooks/direction-setting/useMatches"
) as { normalizeMatches: (body: unknown) => MatchesResult }

const MATCH: FitMatch = {
  jobId: "j1",
  roleTitle: "Customer Success Lead",
  department: "Revenue",
  tier: "professional",
  baseTier: "professional",
  fitBand: "strong",
  totalVariation: 14,
  behaviorVariation: 8,
  aptitudeVariation: 12,
  coreTraitVariation: 20,
  confidence: 0.82,
  fitScore: 73,
}

const MATCH_2: FitMatch = {
  ...MATCH,
  jobId: "j2",
  roleTitle: "Operations Manager",
  department: null,
  fitBand: "developing",
  fitScore: 58,
}

const DETAIL: FitDetail = {
  jobId: "j1",
  roleTitle: "Customer Success Lead",
  tier: "professional",
  baseTier: "professional",
  totalVariation: 14,
  fitScore: 73,
  perDimension: [
    {
      category: "behavior",
      dimensionId: 1,
      dimensionName: "Innovating",
      candidateScore: 70,
      benchmarkScore: 60,
      gap: 10,
      coaching: "Keep leaning on your ideas.",
    },
  ],
  criticalGaps: [{ dimensionName: "Investigative", category: "aptitude", gap: -25 }],
  coachingGaps: [{ dimensionName: "Decisiveness", category: "core-trait", gap: -5 }],
  overdoneFlags: [{ dimensionName: "Innovating", candidateScore: 70 }],
  interviewSelfAdvocacy: [
    "You read a room quickly — say so, and give the example from your last team.",
  ],
  methodologyNote: "This compares your profile with a role's published benchmark.",
}

const renderRouted = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>)

const matchesState = (over: Partial<{ data: MatchesResult; isLoading: boolean; isError: boolean }>) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockUseFitDetail.mockReturnValue({ data: undefined, isLoading: false, isError: false })
})

describe("normalizeMatches", () => {
  test("reads a bare array payload and an envelope-level gate", () => {
    expect(normalizeMatches({ data: [MATCH] })).toEqual({ matches: [MATCH], gated: false })
    expect(normalizeMatches({ data: [], gated: true })).toEqual({ matches: [], gated: true })
  })

  test("reads a wrapped payload, and survives an empty body", () => {
    expect(normalizeMatches({ data: { matches: [MATCH], gated: true } })).toEqual({
      matches: [MATCH],
      gated: true,
    })
    expect(normalizeMatches(undefined)).toEqual({ matches: [], gated: false })
  })
})

describe("MatchesPage — states before any match exists", () => {
  test("says what it is doing while loading", () => {
    mockUseMatches.mockReturnValue(matchesState({ isLoading: true }))
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/lining your profile up against published roles/i)).toBeInTheDocument()
  })

  test("a failed load says nothing has been lost", () => {
    mockUseMatches.mockReturnValue(matchesState({ isError: true }))
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/couldn't load your matches/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing you've done has been lost/i)).toBeInTheDocument()
  })

  // ── The state the target user actually hits ──
  describe("no roles to match against (the shared library is still empty)", () => {
    beforeEach(() => {
      mockUseMatches.mockReturnValue(
        matchesState({ data: { matches: [], gated: false } })
      )
      renderRouted(<MatchesPage />)
    })

    test("explains the real cause instead of showing a bare 'no results'", () => {
      expect(
        screen.getByText(/there aren't any roles to compare you with yet/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/shared library is all there is/i)).toBeInTheDocument()
      expect(screen.getByText(/checked by a person before it's published/i)).toBeInTheDocument()
    })

    test("tells the person it is not about them, and that nothing needs redoing", () => {
      expect(screen.getByText(/nothing is missing from your profile/i)).toBeInTheDocument()
      expect(screen.getByText(/you won't have to redo anything/i)).toBeInTheDocument()
    })

    test("does not read as an error or a fault", () => {
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/couldn't load your matches/i)).not.toBeInTheDocument()
    })

    test("offers stages that do work today", () => {
      expect(screen.getByRole("link", { name: /career areas/i })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /who i am/i })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /interview prep/i })).toBeInTheDocument()
    })

    test("invents no sample matches to fill the space", () => {
      // No ranked list, no ordering control, no fit percentage anywhere.
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
      expect(screen.queryByText(/where you stand/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    })
  })

  test("matching switched off is its own state, worded differently from empty", () => {
    mockUseMatches.mockReturnValue(matchesState({ data: { matches: [], gated: true } }))
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/role matching is switched off for now/i)).toBeInTheDocument()
    expect(screen.getByText(/deliberate hold, not a fault at your end/i)).toBeInTheDocument()
    // Not confused with the empty library.
    expect(
      screen.queryByText(/there aren't any roles to compare you with yet/i)
    ).not.toBeInTheDocument()
  })
})

describe("MatchesPage — with matches", () => {
  beforeEach(() => {
    mockUseMatches.mockReturnValue(
      matchesState({ data: { matches: [MATCH, MATCH_2], gated: false } })
    )
    mockUseFitDetail.mockReturnValue({ data: DETAIL, isLoading: false, isError: false })
  })

  test("lists ranked roles with a fit percentage and a plain-language band", () => {
    renderRouted(<MatchesPage />)
    // The role title appears twice once its breakdown is open (row + summary), so
    // assert presence rather than uniqueness.
    expect(screen.getAllByText("Customer Success Lead").length).toBeGreaterThan(0)
    expect(screen.getByText("Operations Manager")).toBeInTheDocument()
    expect(screen.getByText("Revenue")).toBeInTheDocument()
    expect(screen.getAllByText("73").length).toBeGreaterThan(0)
    expect(screen.getByText("58")).toBeInTheDocument()
    expect(screen.getByText("Strong")).toBeInTheDocument()
  })

  test("opens the best match by default, so the breakdown costs no clicks", () => {
    renderRouted(<MatchesPage />)
    expect(mockUseFitDetail).toHaveBeenCalledWith("j1", "gap")
    expect(screen.getByRole("button", { name: /customer success lead/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  test("self-advocacy leads the breakdown and says these are the person's to claim", () => {
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/what to say out loud about this one/i)).toBeInTheDocument()
    expect(screen.getByText(/you read a room quickly/i)).toBeInTheDocument()
    expect(screen.getByText(/they're yours to claim/i)).toBeInTheDocument()
  })

  test("splits the gap read into priority, steady build and over-expressed strengths", () => {
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/worth putting first/i)).toBeInTheDocument()
    expect(screen.getByText("Investigative")).toBeInTheDocument()
    expect(screen.getByText(/worth building over time/i)).toBeInTheDocument()
    expect(screen.getByText("Decisiveness")).toBeInTheDocument()
    expect(screen.getByText(/strengths you turn up high/i)).toBeInTheDocument()
  })

  test("presents over-expressed strengths as information, not a fault", () => {
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/these are strengths, not faults/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing here needs fixing/i)).toBeInTheDocument()
  })

  test("picking another role re-reads the breakdown for that role", () => {
    renderRouted(<MatchesPage />)
    fireEvent.click(screen.getByRole("button", { name: /operations manager/i }))
    expect(mockUseFitDetail).toHaveBeenLastCalledWith("j2", "gap")
  })

  test("changing the ordering re-reads the matches with that method", () => {
    renderRouted(<MatchesPage />)
    expect(mockUseMatches).toHaveBeenCalledWith("gap")
    fireEvent.click(screen.getByRole("radio", { name: /best overall match/i }))
    expect(mockUseMatches).toHaveBeenLastCalledWith("closeness")
  })

  test("carries the not-a-hiring-decision note from the backend", () => {
    renderRouted(<MatchesPage />)
    expect(
      screen.getByText(/compares your profile with a role's published benchmark/i)
    ).toBeInTheDocument()
  })

  test("a breakdown that will not load says so without losing the list", () => {
    mockUseFitDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/couldn't open the breakdown for this role/i)).toBeInTheDocument()
    expect(screen.getByText("Customer Success Lead")).toBeInTheDocument()
  })

  test("shows a limited-release caveat when the backend flags the role as gated", () => {
    mockUseFitDetail.mockReturnValue({
      data: { ...DETAIL, gated: true },
      isLoading: false,
      isError: false,
    })
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/still in limited release/i)).toBeInTheDocument()
  })
})

describe("PlanPage — the shell before Phase 5", () => {
  test("says the step isn't ready, and that nothing done so far is wasted", () => {
    renderRouted(<PlanPage />)
    expect(screen.getByText(/this step isn't ready yet/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing you do now is wasted/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /back to your journey/i })).toBeInTheDocument()
  })

  test("renders the real sections, each explaining its own absence", () => {
    renderRouted(<PlanPage />)
    expect(screen.getByText(/how you'd close the gap/i)).toBeInTheDocument()
    expect(screen.getByText(/there's no plan to show yet/i)).toBeInTheDocument()
    expect(screen.getByText(/how you'll know it's working/i)).toBeInTheDocument()
    expect(screen.getByText(/checkpoints appear once there's a plan/i)).toBeInTheDocument()
    expect(screen.getByText(/is it worth it\?/i)).toBeInTheDocument()
  })

  test("fabricates no plan steps, timings or money", () => {
    const { container } = renderRouted(<PlanPage />)
    const text = container.textContent ?? ""
    expect(text).not.toMatch(/\$/)
    expect(text).not.toMatch(/\d+\s*months?\b/)
    expect(screen.queryByText(/pays for itself/i)).not.toBeInTheDocument()
  })

  test("the ROI refuses to compute and names what is missing", () => {
    renderRouted(<PlanPage />)
    expect(screen.getByText(/can't work this out honestly yet/i)).toBeInTheDocument()
    expect(screen.getByText(/rather show you nothing than a number we made up/i)).toBeInTheDocument()
    expect(screen.getByText(/what you earn now, or last earned/i)).toBeInTheDocument()
    expect(screen.getByText(/the going rate for the roles you're aiming at/i)).toBeInTheDocument()
  })
})

describe("PlanPage — the components Phase 5 will feed", () => {
  const CRITICAL = {
    id: "p1",
    title: "Practise structured analysis",
    why: "The biggest single distance between you and this role.",
    kind: "critical" as const,
    effort: "about two hours a week for a month",
    cost: null,
  }
  const COACHING = {
    id: "p2",
    title: "Commit to calls sooner",
    why: "A short distance that closes with practice.",
    kind: "coaching" as const,
    effort: "a few minutes a day",
    cost: "$0",
  }

  test("orders by what moves the fit band, whatever order it was handed", () => {
    // Coaching first on the way in; critical must still come out on top.
    renderRouted(<PlanSequence items={[COACHING, CRITICAL]} />)
    const steps = screen.getAllByRole("listitem")
    expect(within(steps[0]).getByText(/practise structured analysis/i)).toBeInTheDocument()
    expect(within(steps[1]).getByText(/commit to calls sooner/i)).toBeInTheDocument()
    expect(screen.getByText(/moves your fit most/i)).toBeInTheDocument()
  })

  test("a step carries its effort and its cost, with time-only said plainly", () => {
    renderRouted(<PlanSequence items={[CRITICAL]} />)
    expect(screen.getByText(/about two hours a week for a month/i)).toBeInTheDocument()
    expect(screen.getByText(/your time only/i)).toBeInTheDocument()
  })

  test("milestones say how you'd know, not just what", () => {
    renderRouted(
      <MilestoneList
        milestones={[
          {
            id: "m1",
            title: "First mock interview done",
            target: "within three weeks",
            evidence: "You can talk through two examples without notes.",
          },
        ]}
      />
    )
    expect(screen.getByText("First mock interview done")).toBeInTheDocument()
    expect(screen.getByText(/without notes/i)).toBeInTheDocument()
    expect(screen.getByText(/within three weeks/i)).toBeInTheDocument()
  })

  test("the ROI computes only when every input is real", () => {
    const roi = {
      paybackMonths: 18,
      threeYearNet: 42000,
      currency: "USD",
      basis: "Based on the salary range you entered and the course cost you gave us.",
    }
    const { rerender } = renderRouted(<RoiSummary roi={roi} missing={[]} />)
    expect(screen.getByText(/18 months/, { selector: "p" })).toBeInTheDocument()
    expect(screen.getByText(/\$42,000/, { selector: "p" })).toBeInTheDocument()
    expect(screen.getByText(/worth arguing with, not worth treating as a promise/i)).toBeInTheDocument()

    // Same numbers, one input still outstanding — it must refuse anyway.
    rerender(
      <MemoryRouter>
        <RoiSummary roi={roi} missing={["the going rate for the roles you're aiming at"]} />
      </MemoryRouter>
    )
    expect(screen.queryByText(/18 months/, { selector: "p" })).not.toBeInTheDocument()
    expect(screen.getByText(/can't work this out honestly yet/i)).toBeInTheDocument()
  })
})
