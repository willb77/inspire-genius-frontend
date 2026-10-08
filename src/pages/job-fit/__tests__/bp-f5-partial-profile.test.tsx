/**
 * @jest-environment jsdom
 *
 * BP-F5 — a partial-profile fit says what it rests on.
 *
 * blueprint-service now leaves a dimension the person was never measured on
 * OUT of the score (it used to count as 0), reports `dimensionsEvaluated` /
 * `dimensionsTotal` / `coverage`, and withholds the tier below full coverage.
 * Every person-side surface must then (a) say "N of 22 measured" and that the
 * rating is held back, (b) never show an unmeasured dimension as "you 0", and
 * (c) stay exactly as it was for a full profile.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockUseFitMatches = jest.fn()
const mockUseFitDetail = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  useFitMatches: (...args: unknown[]) => mockUseFitMatches(...args),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({ useFitDetail: () => mockUseFitDetail() }))
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useFitHistory: () => ({ data: [], isLoading: false, isError: false }),
  useSaveFitReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useFitSnapshot: () => ({ data: undefined, isLoading: false, isError: false }),
}))
const radarProps = jest.fn()
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: (props: unknown) => {
    radarProps(props)
    return <div data-testid="radar" />
  },
}))

import MatchesPage from "../MatchesPage"
import FitDetailPage from "../FitDetailPage"
import type { FitDetail, FitMatch } from "@/types/job-fit"

const FULL_MATCH: FitMatch = {
  jobId: "j1",
  roleTitle: "Customer Success Lead",
  department: "Revenue",
  tier: "strong-fit",
  baseTier: "strong-fit",
  fitBand: "Excellent",
  totalVariation: 14,
  behaviorVariation: 8,
  aptitudeVariation: 12,
  coreTraitVariation: 20,
  confidence: null,
  fitScore: 81,
}

const PARTIAL_MATCH: FitMatch = {
  ...FULL_MATCH,
  jobId: "j2",
  roleTitle: "Field Service Engineer",
  tier: null,
  baseTier: null,
  fitBand: "Partial",
  displayBand: "Partial",
  fitScore: 92,
  dimensionsEvaluated: 8,
  dimensionsTotal: 22,
  coverage: "partial",
  verdictWithheld: true,
}

const PARTIAL_DETAIL: FitDetail = {
  jobId: "j2",
  roleTitle: "Field Service Engineer",
  tier: null,
  baseTier: null,
  totalVariation: 64,
  fitScore: 92,
  dimensionsEvaluated: 1,
  dimensionsTotal: 2,
  coverage: "partial",
  verdictWithheld: true,
  perDimension: [
    { category: "behavior", dimensionId: 1, dimensionName: "Innovating", candidateScore: 70, benchmarkScore: 60, gap: 10, coaching: "", measured: true },
    { category: "aptitude", dimensionId: 2, dimensionName: "Investigative", candidateScore: null, benchmarkScore: 65, gap: null, coaching: "", measured: false },
  ],
  criticalGaps: [],
  coachingGaps: [],
  overdoneFlags: [],
  interviewSelfAdvocacy: [],
  methodologyNote: "Decision support only.",
}

function renderRouted(ui: React.ReactNode, path = "/") {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

function renderDetail() {
  return renderRouted(
    <Routes>
      <Route path="/vertical/job-fit/fit/:jobId" element={<FitDetailPage />} />
    </Routes>,
    "/vertical/job-fit/fit/j2"
  )
}

beforeEach(() => jest.clearAllMocks())

describe("BP-F5 — My fit (matches)", () => {
  test("a partial row says how much it rests on, and the page explains once", () => {
    mockUseFitMatches.mockReturnValue({ data: [PARTIAL_MATCH], isLoading: false, isError: false })
    renderRouted(<MatchesPage />)
    expect(screen.getByText("8 of 22 measured")).toBeInTheDocument()
    const note = screen.getByRole("note")
    expect(note).toHaveTextContent("Partial profile · 8 of 22 measured")
    expect(note).toHaveTextContent(/left out rather than counted against you/)
    expect(note).toHaveTextContent(/overall fit rating is held back/)
  })

  test("a full profile renders exactly as before — no partial label, no note", () => {
    mockUseFitMatches.mockReturnValue({ data: [FULL_MATCH], isLoading: false, isError: false })
    renderRouted(<MatchesPage />)
    expect(screen.getByText("81")).toBeInTheDocument()
    expect(screen.queryByText(/measured/)).not.toBeInTheDocument()
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })

  test("an older payload with no coverage fields is a full read, never guessed partial", () => {
    const legacy: FitMatch = { ...FULL_MATCH, dimensionsEvaluated: 8 } // no coverage: "partial"
    mockUseFitMatches.mockReturnValue({ data: [legacy], isLoading: false, isError: false })
    renderRouted(<MatchesPage />)
    expect(screen.queryByText(/measured/)).not.toBeInTheDocument()
  })
})

describe("BP-F5 — role detail", () => {
  test("the partial note shows and an unmeasured dimension reads 'Not measured', never 0", () => {
    mockUseFitDetail.mockReturnValue({ data: PARTIAL_DETAIL, isLoading: false, isError: false })
    const { container } = renderDetail()
    expect(screen.getAllByRole("note")[0]).toHaveTextContent("Partial profile · 1 of 2 measured")
    expect(screen.getByText("Not measured")).toBeInTheDocument()
    // The measured dimension still shows its signed gap.
    expect(screen.getByText("+10")).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Investigative[^]*?\b0\b/)
  })

  test("the radar is drawn over measured dimensions only (it plots a missing score as 0)", () => {
    mockUseFitDetail.mockReturnValue({ data: PARTIAL_DETAIL, isLoading: false, isError: false })
    renderDetail()
    const props = radarProps.mock.calls[0][0] as {
      behaviors: unknown[]
      aptitudes: unknown[]
      candidateScores: { dimensionName: string }[]
    }
    expect(props.behaviors).toHaveLength(1)
    expect(props.aptitudes).toHaveLength(0)
    expect(props.candidateScores.map((c) => c.dimensionName)).toEqual(["Innovating"])
  })
})
