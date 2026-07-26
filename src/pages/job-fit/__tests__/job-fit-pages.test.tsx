/**
 * @jest-environment jsdom
 *
 * Person-side Job-Fit page smoke + branch tests. Every page is rendered against
 * mocked hooks across loading / error / empty / data states so the page modules
 * and the _shared/_fit helpers stay covered without hitting the network.
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

/* ── Hook mocks ── */
const mockUseFitMatches = jest.fn()
const mockUseFitDetail = jest.fn()
const mockUseFitPathway = jest.fn()
// Forward args so tests can assert the Decision-D4 method the page passes.
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  useFitMatches: (...args: unknown[]) => mockUseFitMatches(...args),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({ useFitDetail: () => mockUseFitDetail() }))
jest.mock("@/hooks/job-fit/useFitPathway", () => ({ useFitPathway: () => mockUseFitPathway() }))

// recharts ResponsiveContainer renders nothing at 0×0 in jsdom; stub the radar
// so FitDetailPage's chart branch renders without noise.
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar" />,
}))

import MatchesPage from "../MatchesPage"
import FitDetailPage from "../FitDetailPage"
import GapsPage from "../GapsPage"
import PathwayPage from "../PathwayPage"
import {
  bandTone,
  bandLabel,
  tierLabel,
  variationDescriptor,
  gapTone,
  formatGap,
} from "../_fit"
import type { FitMatch, FitDetail, FitPathway } from "@/types/job-fit"

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
}

const MATCH_2: FitMatch = {
  ...MATCH,
  jobId: "j2",
  roleTitle: "Operations Manager",
  department: null,
  fitBand: "stretch",
  totalVariation: 44,
}

const DETAIL: FitDetail = {
  jobId: "j1",
  roleTitle: "Customer Success Lead",
  tier: "professional",
  baseTier: "front-line",
  totalVariation: 14,
  perDimension: [
    { category: "behavior", dimensionId: 1, dimensionName: "Innovating", candidateScore: 70, benchmarkScore: 60, gap: 10, coaching: "Keep leaning on your ideas." },
    { category: "aptitude", dimensionId: 2, dimensionName: "Investigative", candidateScore: 40, benchmarkScore: 65, gap: -25, coaching: "Practice structured analysis." },
    { category: "core-trait", dimensionId: 3, dimensionName: "Decisiveness", candidateScore: 55, benchmarkScore: 60, gap: -5, coaching: "Commit to calls sooner." },
  ],
  criticalGaps: [{ dimensionName: "Investigative", category: "aptitude", gap: -25 }],
  coachingGaps: [
    { dimensionName: "Investigative", category: "aptitude", gap: -25 },
    { dimensionName: "Decisiveness", category: "core-trait", gap: -5 },
  ],
  overdoneFlags: [{ dimensionName: "Innovating", candidateScore: 70 }],
  interviewSelfAdvocacy: ["Lead with your track record of new ideas."],
  methodologyNote: "This compares your profile to a role benchmark to guide development.",
}

function renderRouted(ui: React.ReactNode, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
}

beforeEach(() => jest.clearAllMocks())

describe("_fit helpers", () => {
  test("bandTone maps known bands and falls back", () => {
    expect(bandTone("Strong")).toBe("green")
    expect(bandTone("moderate")).toBe("teal")
    expect(bandTone("developing")).toBe("amber")
    expect(bandTone("low")).toBe("red")
    expect(bandTone("weird-band")).toBe("gray")
  })

  test("bandLabel title-cases and handles empty", () => {
    expect(bandLabel("strong-fit")).toBe("Strong Fit")
    expect(bandLabel("")).toBe("Unrated")
  })

  test("tierLabel humanizes tiers", () => {
    expect(tierLabel("front-line")).toBe("Front-line")
    expect(tierLabel("professional")).toBe("Professional")
    expect(tierLabel("executive")).toBe("Executive")
  })

  test("variationDescriptor buckets closeness", () => {
    expect(variationDescriptor(5)).toMatch(/close/i)
    expect(variationDescriptor(18)).toMatch(/strong/i)
    expect(variationDescriptor(30)).toMatch(/workable/i)
    expect(variationDescriptor(50)).toMatch(/stretch/i)
  })

  test("gapTone and formatGap reflect direction", () => {
    expect(gapTone(5)).toBe("green")
    expect(gapTone(-8)).toBe("amber")
    expect(gapTone(-20)).toBe("red")
    expect(formatGap(6)).toBe("+6")
    expect(formatGap(-12)).toBe("-12")
  })
})

describe("MatchesPage", () => {
  test("loading state", () => {
    mockUseFitMatches.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/matching your profile/i)).toBeInTheDocument()
  })

  test("error state", () => {
    mockUseFitMatches.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/couldn't load your matches/i)).toBeInTheDocument()
  })

  test("empty state", () => {
    mockUseFitMatches.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/no published roles/i)).toBeInTheDocument()
  })

  test("renders ranked matches with band pills", () => {
    mockUseFitMatches.mockReturnValue({ data: [MATCH, MATCH_2], isLoading: false, isError: false })
    renderRouted(<MatchesPage />)
    expect(screen.getByText("Customer Success Lead")).toBeInTheDocument()
    expect(screen.getByText("Operations Manager")).toBeInTheDocument()
    expect(screen.getByText("Revenue")).toBeInTheDocument()
    // Standardized matching-validation banner sits prominently at the top.
    expect(screen.getByText(/not a validated selection instrument/i)).toBeInTheDocument()
  })

  // ── Decision D4 — scoring-method toggle ──
  test("defaults to the gap method", () => {
    mockUseFitMatches.mockReturnValue({ data: [MATCH], isLoading: false, isError: false })
    renderRouted(<MatchesPage />)
    // the page asks the hook for the gap read by default
    expect(mockUseFitMatches).toHaveBeenCalledWith("gap")
    // gap read shows the variation descriptor, not a closeness percentage
    expect(screen.getByText(/a strong overall match/i)).toBeInTheDocument()
  })

  test("choosing 'Overall closeness' refetches with the closeness method", () => {
    mockUseFitMatches.mockReturnValue({ data: [MATCH], isLoading: false, isError: false })
    renderRouted(<MatchesPage />)
    fireEvent.click(screen.getByRole("radio", { name: /overall closeness/i }))
    expect(mockUseFitMatches).toHaveBeenLastCalledWith("closeness")
  })

  test("closeness rows show a closeness percentage", () => {
    const closeMatch: FitMatch = { ...MATCH, method: "closeness", closenessScore: 87 }
    mockUseFitMatches.mockReturnValue({ data: [closeMatch], isLoading: false, isError: false })
    renderRouted(<MatchesPage />)
    expect(screen.getByText(/87% closeness to this role/i)).toBeInTheDocument()
  })
})

describe("FitDetailPage", () => {
  function renderDetail() {
    return renderRouted(
      <Routes>
        <Route path="/vertical/job-fit/fit/:jobId" element={<FitDetailPage />} />
      </Routes>,
      "/vertical/job-fit/fit/j1"
    )
  }

  test("loading state", () => {
    mockUseFitDetail.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderDetail()
    expect(screen.getByText(/loading your fit/i)).toBeInTheDocument()
  })

  test("error state", () => {
    mockUseFitDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderDetail()
    expect(screen.getByText(/couldn't load this role/i)).toBeInTheDocument()
  })

  test("renders the full breakdown including the methodology note", () => {
    mockUseFitDetail.mockReturnValue({ data: DETAIL, isLoading: false, isError: false })
    renderDetail()
    expect(screen.getByRole("heading", { name: "Customer Success Lead" })).toBeInTheDocument()
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    // per-dimension coaching text
    expect(screen.getByText(/practice structured analysis/i)).toBeInTheDocument()
    // over-use flag + interview prep + base-tier pill (baseTier != tier)
    expect(screen.getByText(/watch for over-use/i)).toBeInTheDocument()
    expect(screen.getByText(/track record of new ideas/i)).toBeInTheDocument()
    expect(screen.getByText(/base tier/i)).toBeInTheDocument()
    // The validation banner carries the backend methodology note as its body.
    expect(screen.getByText(/not a validated selection instrument/i)).toBeInTheDocument()
    expect(screen.getByText(DETAIL.methodologyNote)).toBeInTheDocument()
  })

  test("surfaces the limited-release line when the role is gated", () => {
    mockUseFitDetail.mockReturnValue({
      data: { ...DETAIL, gated: true },
      isLoading: false,
      isError: false,
    })
    renderDetail()
    expect(screen.getByText(/limited validation release/i)).toBeInTheDocument()
  })
})

describe("GapsPage", () => {
  test("empty state", () => {
    mockUseFitMatches.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderRouted(<GapsPage />)
    expect(screen.getByText(/no matched roles yet/i)).toBeInTheDocument()
  })

  test("aggregates domains and lists widest-gap roles", () => {
    mockUseFitMatches.mockReturnValue({ data: [MATCH, MATCH_2], isLoading: false, isError: false })
    renderRouted(<GapsPage />)
    expect(screen.getByText("Behavioral style")).toBeInTheDocument()
    expect(screen.getByText(/widest gap/i)).toBeInTheDocument()
    // The stretch role (highest totalVariation) should appear in the widest list.
    expect(screen.getByText("Operations Manager")).toBeInTheDocument()
  })
})

describe("PathwayPage", () => {
  test("graceful empty when gated / no content", () => {
    mockUseFitPathway.mockReturnValue({ data: {}, isLoading: false, isError: false })
    renderRouted(<PathwayPage />)
    expect(screen.getByText(/no pathway suggestions/i)).toBeInTheDocument()
  })

  test("error falls back to empty guidance, not a crash", () => {
    mockUseFitPathway.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderRouted(<PathwayPage />)
    expect(screen.getByText(/aren't available yet/i)).toBeInTheDocument()
  })

  test("renders suggestions and skill ladders when present", () => {
    const pathway: FitPathway = {
      suggestions: [
        { roleTitle: "Team Lead", roleFamily: "People Management", pivotDifficulty: "low", rationale: "Close behavioral overlap.", jobId: "j9" },
        { roleTitle: "Analyst", pivotDifficulty: "high" },
      ],
      skillLadders: [{ skill: "Data literacy", steps: ["Learn SQL", "Build a dashboard"] }],
      note: "Suggestions refresh as roles are published.",
    }
    mockUseFitPathway.mockReturnValue({ data: pathway, isLoading: false, isError: false })
    renderRouted(<PathwayPage />)
    expect(screen.getByText("Team Lead")).toBeInTheDocument()
    expect(screen.getByText("Analyst")).toBeInTheDocument()
    expect(screen.getByText("Data literacy")).toBeInTheDocument()
    expect(screen.getByText("Learn SQL")).toBeInTheDocument()
  })
})
