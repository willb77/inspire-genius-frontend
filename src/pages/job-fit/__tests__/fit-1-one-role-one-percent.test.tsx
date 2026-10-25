/**
 * @jest-environment jsdom
 *
 * FIT-1 — same role, same %.
 *
 * Before this, one role could show two different percentages: the list row
 * showed the closeness score under the "Overall closeness" read, while the
 * role's breakdown (Career Fit and Direction Setting) and a reopened history
 * report always showed the gap score. A fallback divided rows by a hard-coded
 * 22 but breakdowns by their own dimension count. And Career Fit threw away the
 * response's `gated` flag, so paused matching read as "no published roles".
 *
 * Every test here fails on the pre-FIT-1 code.
 */
import { render, renderHook, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

/* ── Hook mocks (never axios for pages) ── */
const mockUseFitMatches = jest.fn()
const mockUseFitDetail = jest.fn()
const mockUseMatches = jest.fn()
const mockUseFitSnapshot = jest.fn()
const mockGetMatches = jest.fn()

jest.mock("@/hooks/job-fit/useFitMatches", () => {
  const actual = jest.requireActual("@/hooks/job-fit/useFitMatches")
  return {
    ...actual,
    useFitMatches: (...args: unknown[]) =>
      mockUseFitMatches.getMockImplementation()
        ? mockUseFitMatches(...args)
        : actual.useFitMatches(...args),
  }
})
jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: { getMatches: (...args: unknown[]) => mockGetMatches(...args) },
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: (...args: unknown[]) => mockUseFitDetail(...args),
}))
jest.mock("@/hooks/direction-setting/useMatches", () => ({
  useMatches: (...args: unknown[]) => mockUseMatches(...args),
}))
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useAdvanceJourney: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useFitHistory: () => ({ data: [], isLoading: false, isError: false }),
  useSaveFitReport: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }),
  useFitSnapshot: (...args: unknown[]) => mockUseFitSnapshot(...args),
}))
jest.mock("@/hooks/job-fit/useExplainFit", () => ({
  useExplainFit: () => ({ mutate: jest.fn(), data: undefined, isPending: false, isError: false }),
}))
jest.mock("@/hooks/switches/useJobFitComponentsEnabled", () => ({
  useJobFitComponentsEnabled: () => false,
}))
// FIT-5b: fit_shared_display, OFF unless a twin flips it.
const mockShared = jest.fn(() => false)
jest.mock("@/hooks/switches/useFitSharedDisplayEnabled", () => ({
  useFitSharedDisplayEnabled: () => mockShared(),
}))
jest.mock("@/hooks/switches/useGoalTargetsEnabled", () => ({
  useGoalTargetsEnabled: () => false,
}))
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar" />,
}))

import MatchesPage from "../MatchesPage"
import FitDetailPage from "../FitDetailPage"
import FitHistoryPage from "../FitHistoryPage"
import DsMatchesPage from "@/pages/direction-setting/MatchesPage"
import {
  displayFitPercent,
  fitDetailPath,
  fitPercentDenominator,
  parseFitMethod,
} from "@/components/fit/fit"
import { useFitMatches } from "@/hooks/job-fit/useFitMatches"
import type { FitDetail, FitMatch } from "@/types/job-fit"

/* ── Fixtures: one role, two reads that disagree (gap 40 vs closeness 81) ── */
const CLOSENESS_ROW: FitMatch = {
  jobId: "j1",
  roleTitle: "Customer Success Lead",
  department: null,
  tier: null,
  baseTier: null,
  fitBand: "Poor",
  totalVariation: 60,
  behaviorVariation: 8,
  aptitudeVariation: 12,
  coreTraitVariation: 20,
  confidence: null,
  fitScore: 40,
  method: "closeness",
  closenessScore: 81,
}

const GAP_ROW: FitMatch = { ...CLOSENESS_ROW, method: "gap", closenessScore: null }

const GAP_DETAIL: FitDetail = {
  jobId: "j1",
  roleTitle: "Customer Success Lead",
  tier: null,
  baseTier: null,
  totalVariation: 60,
  fitScore: 40,
  perDimension: [
    { category: "behavior", dimensionId: 1, dimensionName: "Innovating", candidateScore: 70, benchmarkScore: 60, gap: 10, coaching: "", measured: true },
  ],
  criticalGaps: [],
  coachingGaps: [],
  overdoneFlags: [],
  interviewSelfAdvocacy: [],
  methodologyNote: "Decision support only.",
  method: "gap",
}

const CLOSENESS_DETAIL: FitDetail = { ...GAP_DETAIL, method: "closeness", closenessScore: 81 }

const idle = { isLoading: false, isError: false }

function renderAt(ui: ReactNode, path = "/", routePath?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
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
  mockUseFitMatches.mockReset()
  mockUseFitDetail.mockReturnValue({ data: undefined, ...idle })
  mockShared.mockReturnValue(false)
})

/* ── The one rule ── */
describe("displayFitPercent — one rule for rows and breakdowns", () => {
  test("the closeness read shows the closeness score, the gap read shows fitScore", () => {
    expect(displayFitPercent(CLOSENESS_ROW)).toBe(81)
    expect(displayFitPercent(GAP_ROW)).toBe(40)
    expect(displayFitPercent(CLOSENESS_DETAIL)).toBe(81)
    expect(displayFitPercent(GAP_DETAIL)).toBe(40)
  })

  test("a row and a breakdown of the same partial read give the same fallback %", () => {
    // No fitScore (older backend): the fallback divides total variation. 8 of
    // 22 measured, total variation 80 → mean 10 → 90%. Dividing the row by 22
    // gave 96% while the breakdown gave 90%.
    const row: FitMatch = {
      ...GAP_ROW,
      fitScore: undefined,
      totalVariation: 80,
      dimensionsEvaluated: 8,
      dimensionsTotal: 22,
      coverage: "partial",
    }
    const detail: FitDetail = {
      ...GAP_DETAIL,
      fitScore: undefined,
      totalVariation: 80,
      dimensionsEvaluated: 8,
      dimensionsTotal: 22,
      coverage: "partial",
      perDimension: Array.from({ length: 22 }, (_, i) => ({ ...GAP_DETAIL.perDimension[0], dimensionId: i + 1 })),
    }
    expect(displayFitPercent(row)).toBe(90)
    expect(displayFitPercent(detail)).toBe(90)
  })

  test("denominator order: evaluated, then the breakdown's rows, then the benchmark, then 22", () => {
    expect(fitPercentDenominator({ totalVariation: 0, dimensionsEvaluated: 8, perDimension: [1, 2, 3] })).toBe(8)
    expect(fitPercentDenominator({ totalVariation: 0, perDimension: [1, 2, 3], dimensionsTotal: 20 })).toBe(3)
    expect(fitPercentDenominator({ totalVariation: 0, dimensionsTotal: 20 })).toBe(20)
    expect(fitPercentDenominator({ totalVariation: 0 })).toBe(22)
  })

  test("method from a link: only 'closeness' is closeness; anything else is the default", () => {
    expect(parseFitMethod("closeness")).toBe("closeness")
    expect(parseFitMethod("gap")).toBe("gap")
    expect(parseFitMethod("bogus")).toBe("gap")
    expect(parseFitMethod(null)).toBe("gap")
    expect(fitDetailPath("j1", "closeness")).toBe("/vertical/job-fit/fit/j1?method=closeness")
    expect(fitDetailPath("j1", "gap")).toBe("/vertical/job-fit/fit/j1")
    expect(fitDetailPath("j1", undefined)).toBe("/vertical/job-fit/fit/j1")
  })
})

/* ── Career Fit: row → detail carries the read ── */
describe("Career Fit — the row and its detail show the same %", () => {
  test("a closeness row links to its detail under the closeness read", () => {
    mockUseFitMatches.mockReturnValue({ data: [CLOSENESS_ROW], gated: false, ...idle })
    renderAt(<MatchesPage />)
    expect(screen.getByText("81")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Customer Success Lead/ })).toHaveAttribute(
      "href",
      "/vertical/job-fit/fit/j1?method=closeness",
    )
  })

  test("a gap row keeps today's bare link", () => {
    mockUseFitMatches.mockReturnValue({ data: [GAP_ROW], gated: false, ...idle })
    renderAt(<MatchesPage />)
    expect(screen.getByRole("link", { name: /Customer Success Lead/ })).toHaveAttribute(
      "href",
      "/vertical/job-fit/fit/j1",
    )
  })

  test("the detail asks for the link's method and shows the closeness score", () => {
    mockUseFitDetail.mockReturnValue({ data: CLOSENESS_DETAIL, ...idle })
    renderAt(<FitDetailPage />, "/vertical/job-fit/fit/j1?method=closeness", "/vertical/job-fit/fit/:jobId")
    expect(mockUseFitDetail).toHaveBeenCalledWith("j1", "closeness")
    expect(screen.getByText(/about 81% aligned overall/)).toBeInTheDocument()
    expect(screen.queryByText(/about 40% aligned overall/)).not.toBeInTheDocument()
  })

  test.each([
    ["no method param", "/vertical/job-fit/fit/j1"],
    ["an unknown method param", "/vertical/job-fit/fit/j1?method=bogus"],
  ])("%s falls back to the default (gap) read", (_label, path) => {
    mockUseFitDetail.mockReturnValue({ data: GAP_DETAIL, ...idle })
    renderAt(<FitDetailPage />, path, "/vertical/job-fit/fit/:jobId")
    expect(mockUseFitDetail).toHaveBeenCalledWith("j1", "gap")
    expect(screen.getByText(/about 40% aligned overall/)).toBeInTheDocument()
  })
})

/* ── Direction Setting breakdown header ── */
describe("Direction Setting — the breakdown header matches the row", () => {
  test("under the closeness read the header shows the closeness score, not the gap score", () => {
    mockUseMatches.mockReturnValue({ data: { matches: [CLOSENESS_ROW], gated: false }, ...idle })
    mockUseFitDetail.mockReturnValue({ data: CLOSENESS_DETAIL, ...idle })
    const { container } = renderAt(<DsMatchesPage />)
    // Row and header both read 81; nothing on the page reads 40.
    const big = Array.from(container.querySelectorAll("span.text-4xl")).map((n) => n.textContent)
    expect(big).toEqual(["81%"])
    expect(container.textContent).not.toMatch(/\b40%/)
  })

  test("FIT-5b twin: with fit_shared_display on (rows from Career Fit's hook), still 81 and never 40", () => {
    mockShared.mockReturnValue(true)
    mockUseMatches.mockReturnValue({ data: undefined, ...idle })
    mockUseFitMatches.mockImplementation(() => ({ data: [CLOSENESS_ROW], gated: false, ...idle }))
    mockUseFitDetail.mockReturnValue({ data: CLOSENESS_DETAIL, ...idle })
    const { container } = renderAt(<DsMatchesPage />)
    const big = Array.from(container.querySelectorAll("span.text-4xl")).map((n) => n.textContent)
    expect(big).toEqual(["81%"])
    expect(container.textContent).not.toMatch(/\b40%/)
  })
})

/* ── History: the read the snapshot used ── */
describe("Fit history — a reopened report shows the read it was served under", () => {
  test("a matches snapshot ranked by closeness shows each row's closeness score and links under it", () => {
    mockUseFitSnapshot.mockReturnValue({
      data: {
        id: "s1",
        source: "matches",
        note: "",
        roleTitle: "",
        computedAt: "2026-10-19T12:00:00Z",
        engineVersion: "test",
        fitScore: null,
        payload: [CLOSENESS_ROW],
      },
      ...idle,
    })
    renderAt(<FitHistoryPage />, "/vertical/job-fit/history/s1", "/vertical/job-fit/history/:snapshotId")
    expect(screen.getByText("81% fit")).toBeInTheDocument()
    expect(screen.queryByText("40% fit")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Customer Success Lead" })).toHaveAttribute(
      "href",
      "/vertical/job-fit/fit/j1?method=closeness",
    )
  })

  test("a closeness detail snapshot shows the closeness score", () => {
    mockUseFitSnapshot.mockReturnValue({
      data: {
        id: "s2",
        source: "detail",
        note: "",
        roleTitle: "Customer Success Lead",
        computedAt: "2026-10-19T12:00:00Z",
        engineVersion: "test",
        fitScore: null,
        payload: CLOSENESS_DETAIL,
      },
      ...idle,
    })
    const { container } = renderAt(<FitHistoryPage />, "/vertical/job-fit/history/s2", "/vertical/job-fit/history/:snapshotId")
    expect(container.querySelector("span.text-4xl")?.textContent).toBe("81")
  })
})

/* ── Career Fit: paused is not "no roles" ── */
describe("Career Fit — matching paused", () => {
  test("gated and empty says matching is paused, not that there are no roles", () => {
    mockUseFitMatches.mockReturnValue({ data: [], gated: true, ...idle })
    renderAt(<MatchesPage />)
    expect(screen.getByText(/Role matching is paused for now/)).toBeInTheDocument()
    expect(screen.queryByText(/No published roles/)).not.toBeInTheDocument()
  })

  test("not gated and empty keeps today's 'no published roles' copy", () => {
    mockUseFitMatches.mockReturnValue({ data: [], gated: false, ...idle })
    renderAt(<MatchesPage />)
    expect(screen.getByText(/No published roles/)).toBeInTheDocument()
    expect(screen.queryByText(/paused/)).not.toBeInTheDocument()
  })

  test("gated with rows still lists them, with a first-draft note", () => {
    mockUseFitMatches.mockReturnValue({ data: [GAP_ROW], gated: true, ...idle })
    renderAt(<MatchesPage />)
    expect(screen.getByText("40")).toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent(/limited release/)
  })
})

/* ── The hook keeps the envelope's gate ── */
describe("useFitMatches — keeps the gate the envelope carries", () => {
  function wrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }

  test("a gated envelope surfaces gated: true with the rows as data", async () => {
    mockGetMatches.mockResolvedValue({ data: { success: true, data: [GAP_ROW], gated: true } })
    const { result } = renderHook(() => useFitMatches("gap"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([GAP_ROW])
    expect(result.current.gated).toBe(true)
  })

  test("an ungated envelope is gated: false, and a missing data array reads as no rows", async () => {
    mockGetMatches.mockResolvedValue({ data: { success: true, gated: false } })
    const { result } = renderHook(() => useFitMatches("closeness"), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetMatches).toHaveBeenCalledWith("closeness")
    expect(result.current.data).toEqual([])
    expect(result.current.gated).toBe(false)
  })
})
