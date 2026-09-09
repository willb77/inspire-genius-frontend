/**
 * @jest-environment jsdom
 *
 * JS-3 — "Your fit reports" panel and the reopened-report page.
 */
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

const mockHistory = jest.fn()
const mockSnapshot = jest.fn()
const mockSave = { mutateAsync: jest.fn().mockResolvedValue({ id: "imported" }), isPending: false }
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useFitHistory: () => mockHistory(),
  useFitSnapshot: (id: string) => mockSnapshot(id),
  useSaveFitReport: () => mockSave,
}))
jest.mock("@/components/job-blueprint/job-dna/BenchmarkRadarChart", () => ({
  BenchmarkRadarChart: () => <div data-testid="radar" />,
}))

import { FitHistoryPanel } from "../FitHistoryPanel"
import FitHistoryPage from "../FitHistoryPage"
import { LEGACY_SAVED_KEY } from "@/lib/job-fit/legacySavedReports"
import type { FitDetail, FitSnapshotSummary } from "@/types/job-fit"

const ROWS: FitSnapshotSummary[] = [
  { id: "s1", source: "detail", jobId: "j1", roleTitle: "Ops Lead", fitScore: 77, tier: "potential-fit", engineVersion: "v", computedAt: "2026-09-09T12:00:00Z" },
  { id: "s2", source: "target", jobId: null, roleTitle: "Pasted JD", fitScore: 61, tier: "moderate-fit", engineVersion: "v", computedAt: "2026-09-09T11:00:00Z" },
  { id: "s3", source: "matches", jobId: null, roleTitle: "", fitScore: null, tier: null, engineVersion: "v", computedAt: "2026-09-09T10:00:00Z" },
  { id: "s4", source: "saved", jobId: "j1", roleTitle: "Ops Lead", fitScore: 75, tier: null, engineVersion: "v", computedAt: "2026-08-01T10:00:00Z" },
]

const DETAIL: FitDetail = {
  jobId: "j1",
  roleTitle: "Ops Lead",
  tier: "potential-fit" as FitDetail["tier"],
  baseTier: "potential-fit" as FitDetail["baseTier"],
  totalVariation: 210,
  fitScore: 77,
  perDimension: [
    { category: "behavior", dimensionId: 1, dimensionName: "Innovating", candidateScore: 80, benchmarkScore: 72, gap: 8, coaching: "" },
  ],
  criticalGaps: [],
  coachingGaps: [],
  overdoneFlags: [],
  interviewSelfAdvocacy: ["Lead with your ideas."],
  methodologyNote: "n",
}

function routed(ui: React.ReactNode, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/vertical/job-fit/history/:snapshotId" element={ui} />
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  mockSave.mutateAsync.mockClear()
  mockHistory.mockReturnValue({ data: ROWS, isLoading: false, isError: false })
})

describe("FitHistoryPanel", () => {
  it("lists every row newest-first with its source, and reopens roles live and the rest as snapshots", () => {
    routed(<FitHistoryPanel />, "/")
    expect(screen.getByText("Your fit reports")).toBeInTheDocument()
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(4)
    expect(links[0]).toHaveAttribute("href", "/vertical/job-fit/fit/j1")         // a role → live fit
    expect(links[1]).toHaveAttribute("href", "/vertical/job-fit/history/s2")     // pasted JD → snapshot
    expect(links[2]).toHaveAttribute("href", "/vertical/job-fit/history/s3")     // matches → snapshot
    expect(links[3]).toHaveAttribute("href", "/vertical/job-fit/history/s4")     // a save → snapshot
    expect(screen.getByText("Pasted job description", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("Your role matches")).toBeInTheDocument()
    expect(screen.getByText("77% fit")).toBeInTheDocument()
  })

  it("empty history says so", () => {
    mockHistory.mockReturnValue({ data: [], isLoading: false, isError: false })
    routed(<FitHistoryPanel />, "/")
    expect(screen.getByText(/No fit reports yet/i)).toBeInTheDocument()
  })

  it("a load failure is an error, not an empty state", () => {
    mockHistory.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    routed(<FitHistoryPanel />, "/")
    expect(screen.getByText(/couldn't load your fit reports/i)).toBeInTheDocument()
    expect(screen.queryByText(/No fit reports yet/i)).not.toBeInTheDocument()
  })

  it("imports the old localStorage saves once, oldest first, then removes the key", async () => {
    localStorage.setItem(
      LEGACY_SAVED_KEY,
      JSON.stringify([
        { jobId: "j2", roleTitle: "Newer", fitScore: 70, savedAt: "2026-08-02T00:00:00Z" },
        { jobId: "j1", roleTitle: "Older", fitScore: 60, savedAt: "2026-08-01T00:00:00Z" },
      ])
    )
    routed(<FitHistoryPanel />, "/")
    await waitFor(() => expect(mockSave.mutateAsync).toHaveBeenCalledTimes(2))
    expect(mockSave.mutateAsync.mock.calls[0][0]).toMatchObject({ roleTitle: "Older", computedAt: "2026-08-01T00:00:00Z" })
    expect(mockSave.mutateAsync.mock.calls[1][0]).toMatchObject({ roleTitle: "Newer" })
    await waitFor(() => expect(localStorage.getItem(LEGACY_SAVED_KEY)).toBeNull())
  })

  it("keeps the key when an import fails, so it is retried next visit", async () => {
    localStorage.setItem(LEGACY_SAVED_KEY, JSON.stringify([{ jobId: "j1", roleTitle: "Older", fitScore: 60 }]))
    mockSave.mutateAsync.mockRejectedValueOnce(new Error("503"))
    routed(<FitHistoryPanel />, "/")
    await waitFor(() => expect(mockSave.mutateAsync).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 0))
    expect(localStorage.getItem(LEGACY_SAVED_KEY)).not.toBeNull()
  })
})

describe("FitHistoryPage", () => {
  it("reopens a role breakdown with the shared block and the recorded engine", () => {
    mockSnapshot.mockReturnValue({ data: { ...ROWS[0], engineVersion: "ig-blueprint-scoring 0.1.0; scheme=mean-gap", payload: DETAIL }, isLoading: false, isError: false })
    routed(<FitHistoryPage />, "/vertical/job-fit/history/s1")
    expect(mockSnapshot).toHaveBeenCalledWith("s1")
    expect(screen.getByRole("heading", { name: "Ops Lead" })).toBeInTheDocument()
    expect(screen.getByText(/scheme=mean-gap/)).toBeInTheDocument()
    expect(screen.getByText("77")).toBeInTheDocument()
    expect(screen.getByTestId("radar")).toBeInTheDocument()
    expect(screen.getByText("Where you stand, dimension by dimension")).toBeInTheDocument()
  })

  it("reopens a matches snapshot as the ranked list of that day", () => {
    mockSnapshot.mockReturnValue({
      data: { ...ROWS[2], payload: [{ jobId: "j1", roleTitle: "Ops Lead", fitScore: 77, totalVariation: 210 }, { jobId: "j2", roleTitle: "Sales", fitScore: 55, totalVariation: 400 }] },
      isLoading: false, isError: false,
    })
    routed(<FitHistoryPage />, "/vertical/job-fit/history/s3")
    expect(screen.getByText("Roles as ranked that day")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ops Lead" })).toHaveAttribute("href", "/vertical/job-fit/fit/j1")
    expect(screen.getByText("55% fit")).toBeInTheDocument()
  })

  it("a legacy save shows what it kept", () => {
    mockSnapshot.mockReturnValue({ data: { ...ROWS[3], payload: { overview: "about 75% aligned", legacy: true } }, isLoading: false, isError: false })
    routed(<FitHistoryPage />, "/vertical/job-fit/history/s4")
    expect(screen.getByText("Saved report")).toBeInTheDocument()
    expect(screen.getByText("about 75% aligned")).toBeInTheDocument()
  })

  it("someone else's id, or a deleted row, is 'not in your history'", () => {
    mockSnapshot.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { response: { status: 404 } } })
    routed(<FitHistoryPage />, "/vertical/job-fit/history/nope")
    expect(screen.getByText(/isn't in your history/i)).toBeInTheDocument()
  })
})
