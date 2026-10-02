/**
 * @jest-environment jsdom
 *
 * Feeds Phase 3 — goal targets and roadmaps. Pins: the switch OFF means today's
 * pages exactly (no request, no card, no link); "create new" sends no goalId and
 * picking a goal sends it; nothing reports success before the server does; a
 * failure is rendered, never a raw object; the roadmap says when the start or
 * the finish is missing instead of inventing one; the goal list names a Job
 * Fit goal and links its roadmap.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { MyGoalsResponse, SharedGoal } from "@/types/summit"
import type { FitDetail } from "@/types/job-fit"
import type { GoalTargetWithRoadmap, Roadmap, RoadmapRecord } from "@/types/goals/targets"

const mockSwitch = jest.fn()
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => mockSwitch(),
}))
const mockMake = jest.fn()
const mockMine = jest.fn()
const mockRoadmap = jest.fn()
const mockRebuild = jest.fn()
const mockRemove = jest.fn()
jest.mock("@/services/goals/targets.service", () => ({
  makeTarget: (...a: unknown[]) => mockMake(...a),
  getMyTargets: () => mockMine(),
  getRoadmap: (...a: unknown[]) => mockRoadmap(...a),
  rebuildRoadmap: (...a: unknown[]) => mockRebuild(...a),
  removeTarget: (...a: unknown[]) => mockRemove(...a),
}))
const mockGetMyGoals = jest.fn()
jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: () => Promise.resolve({ version: 1, categories: {}, goals: [] }),
  getMyGoals: () => mockGetMyGoals(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
  createGoal: jest.fn(),
  publishGoal: jest.fn(),
  unpublishGoal: jest.fn(),
  setGoalVisibility: jest.fn(),
}))
jest.mock("@/services/manager/development/growthService", () => ({
  getMyGoalReviews: () => Promise.resolve({ reviews: [] }),
}))
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Test Person" } }),
}))

import { MakeTargetCard } from "@/pages/job-fit/MakeTargetCard"
import GoalRoadmapPage from "@/pages/summit/GoalRoadmapPage"
import SummitGoals from "@/pages/summit/SummitGoals"
import { targetErrorText } from "@/pages/summit/_targets"
import { ROUTES } from "@/constants/routes"

const goal = (over: Partial<SharedGoal> = {}): SharedGoal =>
  ({
    goalId: "b1", memberId: "m1", title: "Move into research", category: "career_ambitions",
    horizon: "medium", motivation: "", prismAlignment: { kind: "leverages" }, executionStyle: "",
    successMetric: "", firstStep: "", ownerCoach: "", status: "provisional", provenanceQuotes: [],
    source: "member", visibility: "shareable", publishedFrom: "s-1",
    publishedAt: "2026-09-30T00:00:00Z", ...over,
  }) as SharedGoal

const MINE: MyGoalsResponse = { memberId: "m1", coverage: [], goals: [goal()] }

const FIT = {
  jobId: "job-analyst", roleTitle: "Research Analyst", tier: "professional", baseTier: "professional",
  totalVariation: 14, fitScore: 71, perDimension: [], criticalGaps: [], coachingGaps: [],
  overdoneFlags: [], interviewSelfAdvocacy: [], methodologyNote: "",
} as unknown as FitDetail

const ROADMAP: Roadmap = {
  engineVersion: "goal-roadmap/1", wording: "deterministic", goalId: "b1",
  goalTitle: "Move into research", targetRole: { title: "Research Analyst", blueprintId: "job-analyst" },
  fitScore: 71, start: { firstStep: null, pending: true },
  milestones: [
    {
      itemId: "i1", gapId: "fit:e", competency: "Evaluating", title: "Evaluating", source: "behavioral",
      severity: "critical", rank: 1, direction: "below", currentScore: 40, targetScore: 80,
      magnitude: 40, format: "reading", why: "Build careful weighing of options.",
      canon: { section: "DIM_EVALUATING", dimension: "Evaluating", definition: "A careful, objective drive to weigh things up.", descriptors: "" },
    },
  ],
  finish: { successMetric: "An offer by June", pending: false },
  gapsPending: false, advisories: { overdone: [] }, learningFormat: "reading",
  sequenceBasis: "Critical gaps first.", note: "",
}
const RECORD: RoadmapRecord = {
  roadmapId: "r1", goalId: "b1", targetId: "t1", engineVersion: "goal-roadmap/1", roadmap: ROADMAP,
  supersededAt: null, createdAt: null,
}
const TARGET: GoalTargetWithRoadmap = {
  targetId: "t1", goalId: "b1", memberId: "m1", jobId: "job-analyst", roleTitle: "Research Analyst",
  fitSnapshot: {}, createdAt: null, updatedAt: null, roadmap: RECORD,
}

function renderAt(ui: React.ReactNode, path = "/", routePath?: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        {routePath ? (
          <Routes>
            <Route path={routePath} element={ui} />
            <Route path="/my/goals" element={<div>goals list</div>} />
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
  mockGetMyGoals.mockResolvedValue(MINE)
  mockMine.mockResolvedValue([])
})

describe("MakeTargetCard", () => {
  test("create new sends no goalId, and success is shown only after the server answers", async () => {
    let resolve: (v: unknown) => void = () => {}
    mockMake.mockReturnValue(new Promise((r) => { resolve = r }))
    renderAt(<MakeTargetCard data={FIT} />)
    // Feeds-F5: the form waits for the targets read, so it cannot be clicked first.
    fireEvent.click(await screen.findByRole("button", { name: /make this my target/i }))
    await waitFor(() => expect(mockMake).toHaveBeenCalled())
    expect(mockMake.mock.calls[0][0]).toEqual({ jobId: "job-analyst", fitSnapshot: FIT })
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    resolve({ goal: goal({ goalId: "g-new", title: "Move into Research Analyst" }), target: TARGET, roadmap: RECORD })
    const done = await screen.findByRole("status")
    expect(done).toHaveTextContent(/Move into Research Analyst.*now targets Research Analyst/)
    expect(screen.getByRole("link", { name: /view roadmap/i })).toHaveAttribute("href", "/my/goals/g-new/roadmap")
  })

  test("picking one of my goals sends its id", async () => {
    mockMake.mockResolvedValue({ goal: goal(), target: TARGET, roadmap: RECORD })
    renderAt(<MakeTargetCard data={FIT} />)
    await screen.findByRole("option", { name: "Move into research" })
    fireEvent.change(screen.getByLabelText("Goal"), { target: { value: "b1" } })
    fireEvent.click(screen.getByRole("button", { name: /make this my target/i }))
    await waitFor(() => expect(mockMake).toHaveBeenCalled())
    expect(mockMake.mock.calls[0][0]).toMatchObject({ goalId: "b1", jobId: "job-analyst" })
  })

  test("a failure is rendered as words", async () => {
    mockMake.mockRejectedValue({ response: { status: 403, data: { detail: "Goal targets are not enabled on this tier." } } })
    renderAt(<MakeTargetCard data={FIT} />)
    fireEvent.click(await screen.findByRole("button", { name: /make this my target/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Goal targets are not enabled on this tier.")
  })

  test("a goal already aimed here is named, with its roadmap and no second create (Feeds-F5)", async () => {
    mockMine.mockResolvedValue([TARGET])
    renderAt(<MakeTargetCard data={FIT} />)
    expect(await screen.findByText(/already targets this role/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /make this my target/i })).not.toBeInTheDocument()
  })
})

test("targetErrorText never renders FastAPI's 422 list", () => {
  const text = targetErrorText({ response: { status: 422, data: { detail: [{ loc: ["body"], msg: "x" }] } } })
  expect(text).toBe("That didn't work. Please try again.")
  expect(ROUTES.MY_GOALS.ROADMAP("a b")).toBe("/my/goals/a%20b/roadmap")
})

describe("GoalRoadmapPage", () => {
  const at = () => renderAt(<GoalRoadmapPage />, "/my/goals/b1/roadmap", "/my/goals/:goalId/roadmap")

  test("OFF: says so, and asks the server nothing", async () => {
    mockSwitch.mockResolvedValue(false)
    at()
    expect(await screen.findByText(/aren't available yet/i)).toBeInTheDocument()
    expect(mockRoadmap).not.toHaveBeenCalled()
  })

  test("ON: steps with the canon line; a missing start is said, the finish shown", async () => {
    mockSwitch.mockResolvedValue(true)
    mockRoadmap.mockResolvedValue({ target: TARGET, roadmap: RECORD })
    at()
    expect(await screen.findByText("Evaluating")).toBeInTheDocument()
    expect(mockRoadmap).toHaveBeenCalledWith("b1")
    expect(screen.getByText(/Evaluating in PRISM:/)).toBeInTheDocument()
    expect(screen.getByText(/has no first step yet/)).toBeInTheDocument()
    expect(screen.getByText("An offer by June")).toBeInTheDocument()
    expect(screen.getByText("Priority")).toBeInTheDocument()
  })

  test("a goal with no target explains how to make one", async () => {
    mockSwitch.mockResolvedValue(true)
    mockRoadmap.mockRejectedValue({ response: { status: 404 } })
    at()
    expect(await screen.findByText(/doesn't target a role/)).toBeInTheDocument()
  })

  test("rebuild and stop targeting call the server; stop returns to the list", async () => {
    mockSwitch.mockResolvedValue(true)
    mockRoadmap.mockResolvedValue({ target: TARGET, roadmap: RECORD })
    mockRebuild.mockResolvedValue({ target: TARGET, roadmap: RECORD })
    mockRemove.mockResolvedValue({ goalId: "b1", removed: true })
    at()
    fireEvent.click(await screen.findByRole("button", { name: /rebuild roadmap/i }))
    await waitFor(() => expect(mockRebuild).toHaveBeenCalledWith("b1"))
    fireEvent.click(screen.getByRole("button", { name: /stop targeting/i }))
    expect(await screen.findByText("goals list")).toBeInTheDocument()
    expect(mockRemove).toHaveBeenCalledWith("b1")
  })
})

describe("Goals Studio list", () => {
  test("OFF: no targets request and no target line", async () => {
    mockSwitch.mockResolvedValue(false)
    mockMine.mockResolvedValue([TARGET])
    renderAt(<SummitGoals />)
    expect(await screen.findByText("Move into research")).toBeInTheDocument()
    await waitFor(() => expect(mockSwitch).toHaveBeenCalled())
    expect(mockMine).not.toHaveBeenCalled()
    expect(screen.queryByText(/view roadmap/i)).not.toBeInTheDocument()
  })

  test("ON: a Job Fit goal is named as one and links its roadmap", async () => {
    mockSwitch.mockResolvedValue(true)
    mockGetMyGoals.mockResolvedValue({ ...MINE, goals: [goal({ publishedFrom: "job-fit:job-analyst" })] })
    mockMine.mockResolvedValue([TARGET])
    renderAt(<SummitGoals />)
    const link = await screen.findByRole("link", { name: /view roadmap/i })
    expect(link).toHaveAttribute("href", "/my/goals/b1/roadmap")
    expect(screen.getByText("From Job Fit")).toBeInTheDocument()
    expect(screen.getByText("Research Analyst")).toBeInTheDocument()
  })
})
