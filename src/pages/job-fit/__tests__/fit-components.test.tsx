/**
 * @jest-environment jsdom
 *
 * Feeds Phase 2 — the Job Fit components beside the fit. Pins: the switch OFF
 * means today's page exactly (no request, no chip, no sort); an absent component
 * is named, never shown as a number; the fit % is never replaced; a failed read
 * never blanks the matches list; sorting by goals keeps fit order for ties.
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { FitComponentsResponse } from "@/types/job-fit/components"
import type { FitMatch, FitDetail } from "@/types/job-fit"

const mockSwitch = jest.fn()
const mockGetComponents = jest.fn()
jest.mock("@/services/switches/jobFitComponents.service", () => ({
  getJobFitComponentsEnabled: () => mockSwitch(),
}))
jest.mock("@/services/job-fit/components.service", () => ({
  getFitComponents: (...a: unknown[]) => mockGetComponents(...a),
  getGoalsWiring: jest.fn(),
}))
const mockUseFitMatches = jest.fn()
const mockUseFitDetail = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({ useFitMatches: () => mockUseFitMatches() }))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({ useFitDetail: () => mockUseFitDetail() }))
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useFitHistory: () => ({ data: [], isLoading: false, isError: false }),
  useSaveFitReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useFitSnapshot: () => ({ data: undefined, isLoading: false, isError: false }),
}))
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar" />,
}))

import MatchesPage from "../MatchesPage"
import FitDetailPage from "../FitDetailPage"
import { FitComponentsCard } from "../FitComponentsCard"

const base: FitMatch = {
  jobId: "j1", roleTitle: "Research Analyst", department: "Research", tier: "strong-fit",
  baseTier: "strong-fit", fitBand: "strong", totalVariation: 14, behaviorVariation: 8,
  aptitudeVariation: 12, coreTraitVariation: 20, confidence: 0.8, fitScore: 72,
}
const MATCHES: FitMatch[] = [
  { ...base, jobId: "j-sales", roleTitle: "Account Executive", department: "Sales", fitScore: 80 },
  { ...base, jobId: "j-eng", roleTitle: "Software Engineer", department: null, fitScore: 75 },
  { ...base, jobId: "j-res", roleTitle: "Research Analyst", fitScore: 72 },
]
const RESP: FitComponentsResponse = {
  weights: { behavioural: 60, goalAlignment: 25, experienceMatch: 15 },
  engineVersion: "v1",
  jobs: {
    "j-sales": {
      status: "ok",
      goalAlignment: { status: "scored", family: "Sales & Enterprise", score: 30, verdict: "at-tension", goalIds: ["g2"], goalTitles: ["move into sales"], pullingDimensions: ["Initiating", "Decisiveness"] },
      experienceMatch: { status: "no_activities" },
      composite: { score: 65.3, used: ["behavioural", "goalAlignment"], missing: ["experienceMatch"] },
    },
    "j-eng": {
      status: "ok",
      goalAlignment: { status: "unmapped", family: null },
      experienceMatch: { status: "no_resume" },
      composite: { score: null, used: ["behavioural"], missing: ["goalAlignment", "experienceMatch"] },
    },
    "j-res": {
      status: "ok",
      goalAlignment: { status: "scored", family: "Research & Analysis", score: 88, verdict: "supported", goalIds: ["g1"], goalTitles: ["research role"], pullingDimensions: ["Evaluating"] },
      experienceMatch: { status: "scored", score: 66.7, covered: 2, total: 3, uncovered: ["Negotiate vendor contracts"] },
      composite: { score: 75.2, used: ["behavioural", "experienceMatch", "goalAlignment"], missing: [] },
    },
  },
}

function renderRouted(ui: React.ReactNode, path = "/", routePath?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        {routePath ? (
          <Routes>
            <Route path={routePath} element={ui} />
          </Routes>
        ) : (
          ui
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseFitMatches.mockReturnValue({ data: MATCHES, isLoading: false, isError: false })
})

const titles = () => screen.getAllByRole("link").map((a) => a.textContent ?? "").filter((t) => /Executive|Engineer|Analyst/.test(t))

describe("MatchesPage with the components switch", () => {
  test("OFF: no request, no chip, no sort control — today's page", async () => {
    mockSwitch.mockResolvedValue(false)
    renderRouted(<MatchesPage />)
    await waitFor(() => expect(mockSwitch).toHaveBeenCalled())
    expect(screen.queryByText(/sort by my goals/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/your goals/i)).not.toBeInTheDocument()
    expect(mockGetComponents).not.toHaveBeenCalled()
  })

  test("ON: chips for scored roles only, composite beside the fit %, fit % unchanged", async () => {
    mockSwitch.mockResolvedValue(true)
    mockGetComponents.mockResolvedValue(RESP)
    renderRouted(<MatchesPage />)
    expect(await screen.findByText("Pulls against your goals")).toBeInTheDocument()
    expect(screen.getByText("Supports your goals")).toBeInTheDocument()
    expect(screen.getAllByText(/against your goals|Supports your goals|Mixed/).length).toBe(2)
    expect(screen.getByText("75% composite")).toBeInTheDocument()
    expect(screen.queryByText(/null% composite/)).not.toBeInTheDocument()
    // the row's own fit % is the fit score it always was
    const res = screen.getByText("Research Analyst").closest("a")!
    expect(within(res).getByText("72")).toBeInTheDocument()
    expect(mockGetComponents).toHaveBeenCalledWith([
      { jobId: "j-sales", fitScore: 80 }, { jobId: "j-eng", fitScore: 75 }, { jobId: "j-res", fitScore: 72 },
    ])
  })

  test("Sort by my goals: supported → unlinked → at-tension; off restores fit order", async () => {
    mockSwitch.mockResolvedValue(true)
    mockGetComponents.mockResolvedValue(RESP)
    renderRouted(<MatchesPage />)
    await screen.findByText("Supports your goals")
    expect(titles()[0]).toMatch(/Account Executive/)
    fireEvent.click(screen.getByLabelText(/sort by my goals/i))
    const sorted = titles()
    expect(sorted[0]).toMatch(/Research Analyst/)
    expect(sorted[1]).toMatch(/Software Engineer/)
    expect(sorted[2]).toMatch(/Account Executive/)
    fireEvent.click(screen.getByLabelText(/sort by my goals/i))
    expect(titles()[0]).toMatch(/Account Executive/)
  })

  test("a failed read says so and never blanks the list", async () => {
    mockSwitch.mockResolvedValue(true)
    mockGetComponents.mockRejectedValue(new Error("500"))
    renderRouted(<MatchesPage />)
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't read your goals — sorted by fit/i)
    expect(screen.getByText("Account Executive")).toBeInTheDocument()
    expect(screen.getByText("Research Analyst")).toBeInTheDocument()
  })
})

const DETAIL: FitDetail = {
  jobId: "j-res", roleTitle: "Research Analyst", tier: "professional", baseTier: "professional",
  totalVariation: 14, fitScore: 72, perDimension: [], criticalGaps: [], coachingGaps: [],
  overdoneFlags: [], interviewSelfAdvocacy: [],
} as unknown as FitDetail

describe("FitDetailPage with the components switch", () => {
  test("OFF: no 'How this is made' card and no request", async () => {
    mockSwitch.mockResolvedValue(false)
    mockUseFitDetail.mockReturnValue({ data: DETAIL, isLoading: false, isError: false })
    renderRouted(<FitDetailPage />, "/fit/j-res", "/fit/:jobId")
    await waitFor(() => expect(mockSwitch).toHaveBeenCalled())
    expect(screen.queryByText(/how this is made/i)).not.toBeInTheDocument()
    expect(mockGetComponents).not.toHaveBeenCalled()
  })

  test("ON: the card renders beside the fit, sending the fit % it shows", async () => {
    mockSwitch.mockResolvedValue(true)
    mockGetComponents.mockResolvedValue(RESP)
    mockUseFitDetail.mockReturnValue({ data: DETAIL, isLoading: false, isError: false })
    renderRouted(<FitDetailPage />, "/fit/j-res", "/fit/:jobId")
    expect(await screen.findByText(/how this is made/i)).toBeInTheDocument()
    expect(mockGetComponents).toHaveBeenCalledWith([{ jobId: "j-res", fitScore: 72 }])
  })
})

describe("FitComponentsCard", () => {
  const w = RESP.weights

  test("scored parts: verdict, linked goal, coverage, uncovered named, composite", () => {
    render(<FitComponentsCard fitPct={72} job={RESP.jobs["j-res"]} weights={w} isError={false} />)
    expect(screen.getByText("Supports your goals")).toBeInTheDocument()
    expect(screen.getByText(/linked goal: research role/i)).toBeInTheDocument()
    expect(screen.getByText("2 of 3 activities")).toBeInTheDocument()
    expect(screen.getByText(/not yet on your résumé: negotiate vendor contracts/i)).toBeInTheDocument()
    expect(screen.getByText("Composite: 75%")).toBeInTheDocument()
    expect(screen.getByText(/never a selection verdict/i)).toBeInTheDocument()
  })

  test("a missing part is named and the rescale said out loud", () => {
    render(<FitComponentsCard fitPct={80} job={RESP.jobs["j-sales"]} weights={w} isError={false} />)
    expect(screen.getByText(/doesn't list its critical activities/i)).toBeInTheDocument()
    expect(screen.getByText(/rescaled without your experience/i)).toBeInTheDocument()
    expect(screen.getByText(/pulling against it: initiating and decisiveness/i)).toBeInTheDocument()
  })

  test("only the behavioural part: no composite number, reasons for both absences", () => {
    render(<FitComponentsCard fitPct={75} job={RESP.jobs["j-eng"]} weights={w} isError={false} />)
    expect(screen.getByText("No composite yet")).toBeInTheDocument()
    expect(screen.queryByText(/Composite: \d/)).not.toBeInTheDocument()
    expect(screen.getByText(/isn't linked to a career family/i)).toBeInTheDocument()
    expect(screen.getByText(/add your résumé/i)).toBeInTheDocument()
  })

  test.each([
    [{ status: "no_linked_goal", family: "Design & Creative" }, /none of your published goals point toward design & creative/i],
    [{ status: "unscored", family: "Research & Analysis" }, /complete prism/i],
  ])("goal absence %#", (goalAlignment, text) => {
    const job = { ...RESP.jobs["j-eng"], goalAlignment } as never
    render(<FitComponentsCard fitPct={75} job={job} weights={w} isError={false} />)
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  test("error: an alert, and the fit is said to be unaffected", () => {
    render(<FitComponentsCard fitPct={75} job={undefined} weights={undefined} isError />)
    expect(screen.getByRole("alert")).toHaveTextContent(/your fit above is unaffected/i)
  })

  test("not_found / not loaded renders nothing", () => {
    const { container } = render(
      <FitComponentsCard fitPct={75} job={{ status: "not_found" }} weights={w} isError={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
