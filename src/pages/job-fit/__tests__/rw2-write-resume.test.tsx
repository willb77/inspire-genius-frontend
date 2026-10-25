/**
 * @jest-environment jsdom
 *
 * RW2 follow-up — Career Fit's "Write Résumé" always opens the Résumé Writer
 * aimed at THIS role (/my/resume?jobId=<id>), whatever the server's
 * resume_writer_tailored switch says. The basic inline writer and its route
 * (POST /v1/agents/blueprint/write-resume) were removed on Bill's word, typed in
 * Coord2 2026-10-24 23:13 EDT: "remove Career Fit's old résumé route: yes".
 */
import fs from "fs"
import path from "path"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn() }) }))
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

test.each([
  ["on", () => mockSwitch.mockResolvedValue(true)],
  ["off", () => mockSwitch.mockResolvedValue(false)],
  ["unreadable", () => mockSwitch.mockRejectedValue(new Error("HTTP 404"))],
])("switch %s: Write Résumé opens the Résumé Writer for this role", async (_label, arrange) => {
  arrange()
  renderPage()
  const link = await screen.findByRole("link", { name: /write résumé/i })
  expect(link).toHaveAttribute("href", "/my/resume?jobId=j%2F1")
  // No inline draft button, whatever the switch says.
  expect(screen.queryByRole("button", { name: /write résumé/i })).not.toBeInTheDocument()
  fireEvent.click(link)
  await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/my/resume?jobId=j%2F1"))
})

test("the bar with no role link renders no Write Résumé at all — and needs no router", () => {
  const data = {
    jobId: "j2", roleTitle: "Engineer", tier: null, baseTier: null, totalVariation: 0, fitScore: 50,
    perDimension: [], criticalGaps: [], coachingGaps: [], overdoneFlags: [], interviewSelfAdvocacy: [],
    methodologyNote: "",
  } as unknown as FitDetail
  render(<FitActionsBar data={data} />)
  expect(screen.queryByRole("button", { name: /write résumé/i })).not.toBeInTheDocument()
  expect(screen.queryByRole("link", { name: /write résumé/i })).not.toBeInTheDocument()
})

// ── Static guard: nothing in the app calls the removed route ────────────────

const SRC = path.resolve(__dirname, "../../..")

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue
      sourceFiles(full, acc)
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

test("no app source calls the removed basic résumé route", () => {
  // Mutation: restore resume.service.ts (or any caller of the path) → red.
  const files = sourceFiles(SRC)
  expect(files.length).toBeGreaterThan(200) // the walk saw the tree, not an empty dir
  // A path as a string literal, or the old hook called. FitActionsBar's comment
  // recording the removal names the path in prose and is not a caller.
  const callers = files.filter((f) => {
    const body = fs.readFileSync(f, "utf8")
    return /["'`]\/v1\/agents\/blueprint\/write-resume["'`]/.test(body) || /\buseWriteResume\s*\(/.test(body)
  })
  expect(callers.map((f) => path.relative(SRC, f))).toEqual([])
})
