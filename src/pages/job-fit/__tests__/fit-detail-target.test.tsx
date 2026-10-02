/**
 * @jest-environment jsdom
 *
 * Feeds Phase 3 on the fit detail page: "Make this my target" renders only while
 * the server's goal_targets switch is on, and with it off the page asks nothing
 * about targets.
 */
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockSwitch = jest.fn()
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => mockSwitch(),
}))
const mockMine = jest.fn()
jest.mock("@/services/goals/targets.service", () => ({
  makeTarget: jest.fn(),
  getMyTargets: () => mockMine(),
  getRoadmap: jest.fn(),
  rebuildRoadmap: jest.fn(),
  removeTarget: jest.fn(),
}))
jest.mock("@/services/summit/goals.service", () => ({
  getMyGoals: () => Promise.resolve({ memberId: "m", coverage: [], goals: [] }),
}))
jest.mock("@/hooks/switches/useJobFitComponentsEnabled", () => ({
  useJobFitComponentsEnabled: () => false,
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: () => ({
    data: {
      jobId: "j1", roleTitle: "Research Analyst", tier: "professional", baseTier: "professional",
      totalVariation: 14, fitScore: 71, perDimension: [], criticalGaps: [], coachingGaps: [],
      overdoneFlags: [], interviewSelfAdvocacy: [], methodologyNote: "",
    },
    isLoading: false,
    isError: false,
  }),
}))
jest.mock("@/pages/job-fit/FitBreakdown", () => ({ FitBreakdown: () => <div data-testid="breakdown" /> }))
jest.mock("@/pages/job-fit/_fit", () => ({
  ...jest.requireActual("@/pages/job-fit/_fit"),
  jobFitNarrativeEnabled: () => false,
}))

import FitDetailPage from "@/pages/job-fit/FitDetailPage"

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/vertical/job-fit/fit/j1"]}>
        <Routes>
          <Route path="/vertical/job-fit/fit/:jobId" element={<FitDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockMine.mockResolvedValue([])
})

test("OFF: no card and no targets request — today's page", async () => {
  mockSwitch.mockResolvedValue(false)
  renderPage()
  expect(await screen.findByTestId("breakdown")).toBeInTheDocument()
  await waitFor(() => expect(mockSwitch).toHaveBeenCalled())
  expect(screen.queryByRole("button", { name: /make this my target/i })).not.toBeInTheDocument()
  expect(mockMine).not.toHaveBeenCalled()
})

test("ON: the card renders", async () => {
  mockSwitch.mockResolvedValue(true)
  renderPage()
  expect(await screen.findByRole("button", { name: /make this my target/i })).toBeInTheDocument()
})

function target(jobId: string, goalId: string) {
  return {
    targetId: `t-${goalId}`, goalId, memberId: "m", jobId, roleTitle: "Research Analyst",
    fitSnapshot: {}, createdAt: null, updatedAt: null, roadmap: null,
  }
}

test("F5: a role already targeted offers its roadmap, not a second create", async () => {
  mockSwitch.mockResolvedValue(true)
  mockMine.mockResolvedValue([target("j1", "g1")])
  renderPage()
  const link = await screen.findByRole("link", { name: /view roadmap/i })
  expect(link).toHaveAttribute("href", "/my/goals/g1/roadmap")
  expect(screen.queryByRole("button", { name: /make this my target/i })).not.toBeInTheDocument()
  expect(screen.queryByLabelText("Goal")).not.toBeInTheDocument()
})

test("F5: a target on ANOTHER role still leaves this one's create form", async () => {
  mockSwitch.mockResolvedValue(true)
  mockMine.mockResolvedValue([target("j-other", "g2")])
  renderPage()
  expect(await screen.findByRole("button", { name: /make this my target/i })).toBeInTheDocument()
  expect(screen.queryByRole("link", { name: /view roadmap/i })).not.toBeInTheDocument()
})

test("F5: if the targets read fails the form stays (a create reuses the goal)", async () => {
  mockSwitch.mockResolvedValue(true)
  mockMine.mockRejectedValue(new Error("boom"))
  renderPage()
  expect(await screen.findByRole("button", { name: /make this my target/i })).toBeInTheDocument()
})
