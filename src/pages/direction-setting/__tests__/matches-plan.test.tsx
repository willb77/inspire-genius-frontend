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

// Stages 9 and 10 both run the accept-then-poll machine; the machine itself is
// exercised in the alignment suite, so here the hooks are stubbed and every
// phase the page can land on is rendered directly.
const mockUsePlan = jest.fn()
const mockUseRoi = jest.fn()
jest.mock("@/hooks/direction-setting/usePlan", () => ({
  usePlan: () => mockUsePlan(),
  useRoi: () => mockUseRoi(),
}))

import MatchesPage from "../MatchesPage"
import PlanPage, {
  MilestoneList,
  PlanItemCard,
  PlanSequence,
  RecommendationPanel,
  RoiSummary,
} from "../PlanPage"
import type {
  PlanItem,
  PlanResultPayload,
  RoiBand,
  RoiConfidence,
  RoiRecommendation,
  RoiResultPayload,
} from "@/types/direction-setting"

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

/* ══════════════════════════════════════════════════════════════════════════
 * Stages 9 and 10.
 *
 * The presentational pieces are driven with the **wire** payloads — the shapes
 * `plan.py` and `roi.py` actually serialise — rather than a convenient local
 * approximation. Two of them are load-bearing and would be lost by a friendlier
 * fixture: a behavioural item has **no `cost` key at all** (not `cost: null`),
 * and an ROI refusal carries codes plus prose while `roi` may still be a fully
 * populated object.
 * ══════════════════════════════════════════════════════════════════════════ */

const BEHAVIOURAL: PlanItem = {
  itemId: "i1",
  gapId: "g1",
  competency: "Investigative & Analytical",
  title: "Practise structured analysis",
  provider: null,
  source: "behavioral",
  costable: false,
  severity: "critical",
  rank: 1,
  origin: "fit-engine",
  goalId: null,
  category: "aptitude",
  currentScore: 34,
  targetScore: 90,
  magnitude: 56,
  direction: "below",
  format: "reading",
  effort: {
    hours: null,
    horizon: "every fortnight",
    known: false,
    basis: "unknown",
    statement:
      "We do not know how long this takes. Nothing on file estimates it.",
  },
  why: "The biggest single distance between you and this role.",
  status: "not_started",
  phrasing: "derived",
  // No `cost` key. Deliberate — see the block comment above.
}

const SKILL: PlanItem = {
  ...BEHAVIOURAL,
  itemId: "i2",
  gapId: "g2",
  competency: "Data Analysis Certificate",
  title: "Data Analysis Certificate",
  provider: "A named provider",
  source: "skill",
  costable: true,
  severity: "coaching",
  rank: 2,
  effort: {
    hours: 40,
    horizon: "monthly",
    known: true,
    basis: "stated",
    statement: "40 hours, as stated.",
  },
  why: "A credential the role's postings ask for by name.",
  cost: {
    amount: 1200,
    currency: "USD",
    known: true,
    basis: "stated",
    statement: "Priced at 1200 USD.",
  },
}

const plan = (over: Partial<PlanResultPayload> = {}): PlanResultPayload => ({
  targetRole: { title: "Operations Analyst", blueprintId: null },
  targetRolePending: false,
  gapsPending: false,
  sequence: [BEHAVIOURAL, SKILL],
  counts: { total: 2, behavioural: 1, skill: 1, critical: 1, coaching: 1 },
  effort: {
    statedHours: 40,
    itemsWithStatedEffort: 1,
    itemsWithUnknownEffort: 1,
    complete: false,
    statement:
      "1 of 2 items state a duration; 1 does not and is not guessed at.",
  },
  cost: {
    knownTotal: 1200,
    currency: "USD",
    costableItems: 1,
    itemsWithKnownCost: 1,
    itemsWithUnknownCost: 0,
    itemsNotCostable: 1,
    complete: true,
    statement: "1 of 1 purchasable item(s) are priced.",
  },
  advisories: { overdone: [] },
  refusals: [],
  learningFormat: "reading",
  dominantQuadrant: "analytical",
  sequenceBasis:
    "Critical gaps first, then coaching gaps; within a tier, the largest miss first.",
  note: "Deterministic: sequenced from the fit engine's own gap tiers.",
  ...over,
})

const band = (over: Partial<RoiBand> = {}): RoiBand => ({
  atEntryWage: 4.1,
  atMedianWage: 1.8,
  atExperiencedWage: 0.9,
  low: 0.9,
  high: 4.1,
  unit: "years",
  basis: "the plan's priced items, divided by the uplift at each wage point",
  known: true,
  unreachableAt: [],
  note: "A payback period is not a duration of study.",
  ...over,
})

const CONFIDENCE: RoiConfidence = {
  score: 0.6,
  band: "moderate",
  inputs: [],
  degradedBy: [
    {
      key: "target-salary",
      penalty: 0.15,
      statement:
        "The target wage is a curated static reference figure, not a live market read.",
    },
  ],
  ceiling:
    "No ROI computed from the curated static wage table can reach the 'high' band.",
  statement: "Confidence: moderate.",
}

const NO_RECOMMENDATION: RoiRecommendation = {
  recommendDifferentTarget: false,
  tier: "strong",
  criticalGaps: 0,
  grounds: [],
  decisiveGrounds: [],
  cautions: [],
  alternatives: [],
  statement: "Nothing here argues against Operations Analyst.",
}

const roiPayload = (over: Partial<RoiResultPayload> = {}): RoiResultPayload => ({
  targetRole: { title: "Operations Analyst", blueprintId: null },
  targetRolePending: false,
  occupation: {
    code: "13-1111",
    title: "Management Analyst",
    source: "Curated static reference table",
    asOf: "2024-05",
  },
  salary: {
    low: 52000,
    median: 83000,
    high: 121000,
    source: "Curated static reference table",
    asOf: "2024-05",
  },
  outlook: null,
  currentIncome: {
    amount: 31000,
    currency: "USD",
    basis: "stated",
    statedZero: false,
    statement: "Computed against a stated current income of $31,000.",
  },
  cost: {
    total: 1200,
    currency: "USD",
    costableItems: 1,
    itemsWithKnownCost: 1,
    itemsWithUnknownCost: 0,
    complete: true,
    basis: "stated",
    statement: "Every purchasable item on the plan is priced.",
  },
  effort: {
    statedHours: 40,
    itemsWithStatedEffort: 1,
    itemsWithUnknownEffort: 1,
    complete: false,
    convertedToMoney: false,
    statement: "1 of 2 items state a duration.",
  },
  roi: {
    currency: "USD",
    horizonYears: 3,
    upliftPerYear: band({ unit: "USD", atEntryWage: 21000, atMedianWage: 52000, atExperiencedWage: 90000 }),
    paybackYears: band(),
    netOverHorizon: band({ unit: "USD", atEntryWage: 61800, atMedianWage: 154800, atExperiencedWage: 268800 }),
    unreachableAt: [],
    statement: "At the median wage the priced part of your plan pays for itself.",
    confidenceBand: "moderate",
    confidenceScore: 0.6,
  },
  missing: [],
  missingStatements: [],
  computable: true,
  confidence: CONFIDENCE,
  recommendation: NO_RECOMMENDATION,
  narration: null,
  refusals: [],
  note: "Deterministic: computed in Python. Decision support only.",
  ...over,
})

/** The refusal that is easiest to render wrongly. */
const PURCHASABLE_PATH_STATEMENT =
  "Every gap on your plan is behavioural — coached, practised and reviewed, " +
  "not bought. That is not a zero-cost path into this role; it means this is " +
  "not a purchasable transition."

const jobState = (over: Record<string, unknown> = {}) => ({
  phase: "idle",
  result: null,
  jobStatus: null,
  jobError: null,
  isStarting: false,
  start: jest.fn(),
  storedFailed: false,
  ...over,
})

describe("PlanPage — the two job surfaces", () => {
  beforeEach(() => {
    mockUsePlan.mockReturnValue(jobState())
    mockUseRoi.mockReturnValue(jobState())
  })

  test("with nothing run, offers to run each stage and invents nothing", () => {
    const { container } = renderRouted(<PlanPage />)
    expect(
      screen.getByRole("button", { name: /work out your plan/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /work out whether it pays off/i })
    ).toBeInTheDocument()
    // No fabricated steps, timings or money on an unrun page.
    expect(container.textContent).not.toMatch(/\$\s?\d/)
    expect(screen.queryByText(/pays for itself/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /back to your journey/i })
    ).toBeInTheDocument()
  })

  test("waiting is a state with words, not a bare spinner", () => {
    mockUsePlan.mockReturnValue(jobState({ phase: "waiting" }))
    renderRouted(<PlanPage />)
    expect(screen.getByText(/working on your plan/i)).toBeInTheDocument()
    expect(screen.getByText(/carries on without you/i)).toBeInTheDocument()
  })

  test("a failed run says nothing was lost and offers a retry", () => {
    const start = jest.fn()
    mockUsePlan.mockReturnValue(
      jobState({ phase: "failed", jobError: "worker died", start })
    )
    renderRouted(<PlanPage />)
    expect(screen.getByText(/didn't finish/i)).toBeInTheDocument()
    expect(screen.getByText("worker died")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(start).toHaveBeenCalled()
  })

  test("a lost job id is its own state, not dressed up as a failure", () => {
    mockUsePlan.mockReturnValue(jobState({ phase: "lost" }))
    renderRouted(<PlanPage />)
    expect(screen.getByText(/lost track of that run/i)).toBeInTheDocument()
    expect(screen.queryByText(/didn't finish/i)).not.toBeInTheDocument()
  })

  test("a ready plan and a refusing ROI render side by side", () => {
    mockUsePlan.mockReturnValue(jobState({ phase: "ready", result: plan() }))
    mockUseRoi.mockReturnValue(
      jobState({
        phase: "ready",
        result: roiPayload({
          roi: null,
          computable: false,
          missing: ["purchasable-path"],
          missingStatements: [PURCHASABLE_PATH_STATEMENT],
        }),
      })
    )
    renderRouted(<PlanPage />)
    expect(screen.getByText(/how you'd close the gap/i)).toBeInTheDocument()
    expect(screen.getByText("Practise structured analysis")).toBeInTheDocument()
    expect(screen.getByText(/is it worth it\?/i)).toBeInTheDocument()
    expect(
      screen.getByText(/this isn't a transition you can buy/i)
    ).toBeInTheDocument()
  })
})

describe("PlanSequence — the order is the server's", () => {
  test("renders the sequence exactly as handed over, never re-sorted", () => {
    // A coaching item first and a critical item second: the wrong-looking order
    // on purpose. If this page ever re-sorts client-side, this flips.
    const coachingFirst = { ...SKILL, rank: 1 }
    const criticalSecond = { ...BEHAVIOURAL, rank: 2 }
    renderRouted(
      <PlanSequence plan={plan({ sequence: [coachingFirst, criticalSecond] })} />
    )
    const steps = screen.getAllByRole("listitem")
    expect(
      within(steps[0]).getByText("Data Analysis Certificate")
    ).toBeInTheDocument()
    expect(
      within(steps[1]).getByText("Practise structured analysis")
    ).toBeInTheDocument()
  })

  test("prints the backend's own reason for the ordering", () => {
    renderRouted(<PlanSequence plan={plan()} />)
    expect(
      screen.getByText(/critical gaps first, then coaching gaps/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/moves your fit most/i)).toBeInTheDocument()
  })

  test("empty is explained, not blank", () => {
    renderRouted(
      <PlanSequence
        plan={plan({
          sequence: [],
          gapsPending: true,
          note: "Nothing is in the way of this role that we can see.",
        })}
      />
    )
    expect(
      screen.getByText(/nothing is in the way of this role/i)
    ).toBeInTheDocument()
  })

  test("carries the plan's own totals, including what cannot be totalled", () => {
    renderRouted(
      <PlanSequence
        plan={plan({
          cost: {
            ...plan().cost,
            knownTotal: null,
            currency: null,
            itemsWithKnownCost: 0,
            itemsWithUnknownCost: 1,
            complete: false,
            statement:
              "1 item(s) could carry a price and none of them do. The total is unknown rather than zero.",
          },
        })}
      />
    )
    expect(
      screen.getByText(/the total is unknown rather than zero/i)
    ).toBeInTheDocument()
  })

  test("reports refused inputs rather than swallowing them", () => {
    renderRouted(
      <PlanSequence
        plan={plan({
          refusals: ["A behavioural gap arrived carrying a price; it was dropped."],
        })}
      />
    )
    expect(screen.getByText(/1 input was refused/i)).toBeInTheDocument()
    expect(
      screen.getByText(/arrived carrying a price; it was dropped/i)
    ).toBeInTheDocument()
  })
})

describe("PlanItemCard — the taxonomy, at the point of render", () => {
  test("a behavioural item shows no cost affordance at all", () => {
    const { container } = renderRouted(
      <ol>
        <PlanItemCard item={BEHAVIOURAL} />
      </ol>
    )
    // Not "$0", not "free", not a blank slot that reads as free.
    expect(container.textContent).not.toMatch(/\$/)
    expect(container.textContent).not.toMatch(/cost:/i)
    expect(screen.getByText(/not something you buy/i)).toBeInTheDocument()
  })

  test("unknown effort says so in words, never as a number", () => {
    const { container } = renderRouted(
      <ol>
        <PlanItemCard item={BEHAVIOURAL} />
      </ol>
    )
    expect(
      screen.getByText(/we don't know how long this takes/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/nothing on file estimates it/i)
    ).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\b0\s*hours?\b/)
  })

  test("a priced skill item shows its price and its stated effort", () => {
    renderRouted(
      <ol>
        <PlanItemCard item={SKILL} />
      </ol>
    )
    expect(screen.getByText(/cost: \$1,200/i)).toBeInTheDocument()
    expect(screen.getByText(/effort: 40 hours/i)).toBeInTheDocument()
  })

  test("a costable item that nobody has priced says unknown, not free", () => {
    renderRouted(
      <ol>
        <PlanItemCard
          item={{
            ...SKILL,
            cost: {
              amount: null,
              currency: null,
              known: false,
              basis: "unknown",
              statement:
                "We do not know what this costs. Price it and it enters the ROI.",
            },
          }}
        />
      </ol>
    )
    expect(screen.getByText(/cost: not known/i)).toBeInTheDocument()
    expect(screen.getByText(/price it and it enters the roi/i)).toBeInTheDocument()
  })
})

describe("RoiSummary — refusal is the ordinary path", () => {
  test("a purchasable-path refusal is not rendered as a free, instant route", () => {
    const { container } = renderRouted(
      <RoiSummary
        result={roiPayload({
          roi: null,
          computable: false,
          missing: ["purchasable-path"],
          missingStatements: [PURCHASABLE_PATH_STATEMENT],
        })}
      />
    )
    expect(
      screen.getByText(/this isn't a transition you can buy/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not a zero-cost path into this role/i)
    ).toBeInTheDocument()
    // The failure mode: "£0 payback", or any payback figure at all.
    expect(container.textContent).not.toMatch(/\$\s?0\b/)
    expect(screen.queryByText(/before it pays for itself/i)).not.toBeInTheDocument()
  })

  test("numbers present but inputs missing still refuses, and says which", () => {
    const { container } = renderRouted(
      <RoiSummary
        result={roiPayload({
          missing: ["item-prices"],
          missingStatements: [
            "2 of 3 purchasable item(s) are unpriced. The figures below are a floor.",
          ],
        })}
      />
    )
    // `roi` is a fully populated object here — and none of it is shown.
    expect(screen.getByText(/floor, not an answer/i)).toBeInTheDocument()
    expect(screen.getByText(/some of the plan is unpriced/i)).toBeInTheDocument()
    expect(screen.queryByText(/before it pays for itself/i)).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/1\.8 years/)
  })

  test("an unknown refusal code still reaches the reader via its statement", () => {
    renderRouted(
      <RoiSummary
        result={roiPayload({
          roi: null,
          computable: false,
          missing: ["some-future-code"],
          missingStatements: ["Could not be established: some-future-code."],
        })}
      />
    )
    expect(
      screen.getByText(/could not be established: some-future-code/i)
    ).toBeInTheDocument()
  })

  test("a clean ROI shows a range across three wage points, never one figure", () => {
    renderRouted(<RoiSummary result={roiPayload()} />)
    expect(screen.getByText(/before it pays for itself/i)).toBeInTheDocument()
    // Every band states all three points, so these repeat by design.
    expect(screen.getAllByText("At the entry wage").length).toBe(3)
    expect(screen.getAllByText("At the median wage").length).toBe(3)
    expect(screen.getAllByText("At the experienced end").length).toBe(3)
    expect(screen.getByText("4.1 years")).toBeInTheDocument()
    expect(screen.getByText("1.8 years")).toBeInTheDocument()
    // No scalar anywhere: there is no single "expected" payback to render.
    expect(screen.queryByText(/expected payback/i)).not.toBeInTheDocument()
  })

  test("a wage point below current income reads as never, not as zero", () => {
    renderRouted(
      <RoiSummary
        result={roiPayload({
          roi: {
            ...roiPayload().roi!,
            paybackYears: band({
              atEntryWage: null,
              low: 0.9,
              high: 1.8,
              unreachableAt: ["entry"],
            }),
            unreachableAt: ["entry"],
          },
        })}
      />
    )
    expect(
      screen.getByText(/never reaches payback at this wage/i)
    ).toBeInTheDocument()
  })

  test("confidence sits next to the numbers, with what degraded it", () => {
    renderRouted(<RoiSummary result={roiPayload()} />)
    expect(screen.getByText(/confidence: moderate/i)).toBeInTheDocument()
    expect(
      screen.getByText(/curated static reference figure, not a live market read/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/no roi computed from the curated static wage table can reach/i)
    ).toBeInTheDocument()
  })

  test("confidence is shown on a refusal too, not only on a happy path", () => {
    renderRouted(
      <RoiSummary
        result={roiPayload({
          roi: null,
          computable: false,
          missing: ["current-income"],
          missingStatements: ["No current income on file, and none assumed."],
        })}
      />
    )
    expect(screen.getByText(/confidence: moderate/i)).toBeInTheDocument()
  })
})

describe("RecommendationPanel — a nearer target, said respectfully", () => {
  const RECOMMEND: RoiRecommendation = {
    recommendDifferentTarget: true,
    tier: "misalignment",
    criticalGaps: 2,
    grounds: [
      {
        code: "critical-gaps",
        decisive: true,
        signal: { criticalGaps: 2 },
        statement:
          "2 dimensions this role treats as critical sit further than the guardrail allows from where you currently score.",
      },
    ],
    decisiveGrounds: ["critical-gaps"],
    cautions: [],
    alternatives: [
      {
        family: "Analysis & Research",
        affinity: 78,
        pivotDifficulty: "moderate",
        range: {
          low: 52000,
          median: 83000,
          high: 121000,
          source: "Curated static reference table",
          asOf: "2024-05",
        },
        why: "Your own stage-3 ranking puts Analysis & Research at 78 affinity.",
      },
    ],
    statement:
      "A nearer one: Analysis & Research. That reads your profile, not this role's benchmark.",
  }

  test("names alternatives with reasons, and leaves the choice with the reader", () => {
    const { container } = renderRouted(
      <RecommendationPanel recommendation={RECOMMEND} />
    )
    expect(screen.getByText(/there may be a nearer target/i)).toBeInTheDocument()
    expect(screen.getByText("Analysis & Research")).toBeInTheDocument()
    expect(screen.getByText(/78 affinity/i)).toBeInTheDocument()
    expect(screen.getByText(/\$52,000 – \$121,000/)).toBeInTheDocument()
    expect(screen.getByText(/yours to overrule/i)).toBeInTheDocument()

    // The phrasing the backend deliberately avoids, and so must this. Putting
    // "you cannot do this" in front of a frightened reader — even to deny it —
    // is the defect.
    expect(container.textContent).not.toMatch(/you can'?t do this/i)
    expect(container.textContent).not.toMatch(/cannot do it/i)
    expect(container.textContent).not.toMatch(/not good enough/i)
  })

  test("shows the grounds it rests on rather than asserting a conclusion", () => {
    renderRouted(<RecommendationPanel recommendation={RECOMMEND} />)
    expect(screen.getByText(/what that's based on/i)).toBeInTheDocument()
    expect(
      screen.getByText(/further than the guardrail allows/i)
    ).toBeInTheDocument()
  })

  test("a caution short of a recommendation is worded differently", () => {
    renderRouted(
      <RecommendationPanel
        recommendation={{
          ...RECOMMEND,
          recommendDifferentTarget: false,
          alternatives: [],
          statement: "One thing is worth flagging before you commit to it.",
        }}
      />
    )
    expect(screen.getByText(/worth knowing before you commit/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/there may be a nearer target/i)
    ).not.toBeInTheDocument()
  })

  test("renders nothing when there is nothing to say", () => {
    const { container } = renderRouted(
      <RecommendationPanel recommendation={NO_RECOMMENDATION} />
    )
    expect(container.textContent).toBe("")
  })
})

describe("MilestoneList — no invented deadlines", () => {
  test("empty explains why it is empty", () => {
    renderRouted(<MilestoneList milestones={[]} />)
    expect(screen.getByText(/don't set you dated checkpoints/i)).toBeInTheDocument()
    expect(screen.getByText(/review horizon instead/i)).toBeInTheDocument()
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
})
