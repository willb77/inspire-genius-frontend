/**
 * @jest-environment jsdom
 *
 * RW2 — Career Fit's "Write Résumé". While the server's resume_writer_tailored
 * switch is on, it opens the Résumé Writer aimed at THIS role
 * (/my/resume?jobId=<id>) and never calls the basic inline writer. Off, loading
 * or unreadable, it is today's button: the inline draft, and no link.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn() }) }))
const mockResume = { mutateAsync: jest.fn(), data: undefined as unknown, isPending: false, isError: false }
jest.mock("@/hooks/job-fit/useWriteResume", () => ({ useWriteResume: () => mockResume }))
jest.mock("@/hooks/job-fit/useFitHistory", () => ({
  useSaveFitReport: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
const mockSwitch = jest.fn()
jest.mock("@/services/switches/resumeWriterTailored.service", () => ({
  getResumeWriterTailoredEnabled: () => mockSwitch(),
}))
jest.mock("@/hooks/switches/useJobFitComponentsEnabled", () => ({ useJobFitComponentsEnabled: () => false }))
jest.mock("@/hooks/switches/useGoalTargetsEnabled", () => ({ useGoalTargetsEnabled: () => false }))
jest.mock("@/hooks/switches/useFitSharedDisplayEnabled", () => ({ useFitSharedDisplayEnabled: () => false }))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: () => ({
    data: {
      jobId: "j/1", roleTitle: "Research Analyst", tier: "professional", baseTier: "professional",
      totalVariation: 14, fitScore: 71, perDimension: [], criticalGaps: [], coachingGaps: [],
      overdoneFlags: [], interviewSelfAdvocacy: [], methodologyNote: "",
    },
    isLoading: false,
    isError: false,
  }),
}))
jest.mock("@/pages/job-fit/FitBreakdown", () => ({ FitBreakdown: () => <div data-testid="breakdown" /> }))
jest.mock("@/pages/job-fit/FitFollowUpCard", () => ({ FitFollowUpCard: () => null }))
jest.mock("@/components/fit/fit", () => ({
  ...jest.requireActual("@/components/fit/fit"),
  jobFitNarrativeEnabled: () => true,
}))

import FitDetailPage from "@/pages/job-fit/FitDetailPage"
import { FitActionsBar } from "@/pages/job-fit/FitActionsBar"
import type { FitDetail } from "@/types/job-fit"

function Where() {
  const loc = useLocation()
  return <div data-testid="where">{loc.pathname + loc.search}</div>
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/vertical/job-fit/fit/j%2F1"]}>
        <Routes>
          <Route path="/vertical/job-fit/fit/:jobId" element={<FitDetailPage />} />
          <Route path="/my/resume" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => jest.clearAllMocks())

test("ON: Write Résumé opens the Résumé Writer for this role, never the basic writer", async () => {
  mockSwitch.mockResolvedValue(true)
  renderPage()
  const link = await screen.findByRole("link", { name: /write résumé/i })
  expect(link).toHaveAttribute("href", "/my/resume?jobId=j%2F1")
  fireEvent.click(link)
  await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/my/resume?jobId=j%2F1"))
  expect(mockResume.mutateAsync).not.toHaveBeenCalled()
})

test.each([
  ["off", () => mockSwitch.mockResolvedValue(false)],
  ["unreadable", () => mockSwitch.mockRejectedValue(new Error("HTTP 404"))],
])("%s: Write Résumé is today's button and drafts inline", async (_label, arrange) => {
  arrange()
  renderPage()
  await waitFor(() => expect(mockSwitch).toHaveBeenCalled())
  expect(screen.queryByRole("link", { name: /write résumé/i })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: /write résumé/i }))
  await waitFor(() => expect(mockResume.mutateAsync).toHaveBeenCalled())
  expect(mockResume.mutateAsync.mock.calls[0][0]).toMatchObject({ roleTitle: "Research Analyst" })
})

test("the bar on its own (no href) needs no router and keeps today's button", () => {
  const data = {
    jobId: "j2", roleTitle: "Engineer", tier: null, baseTier: null, totalVariation: 0, fitScore: 50,
    perDimension: [], criticalGaps: [], coachingGaps: [], overdoneFlags: [], interviewSelfAdvocacy: [],
    methodologyNote: "",
  } as unknown as FitDetail
  render(<FitActionsBar data={data} />)
  expect(screen.getByRole("button", { name: /write résumé/i })).toBeInTheDocument()
})
