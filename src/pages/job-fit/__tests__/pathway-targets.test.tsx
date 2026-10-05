/**
 * @jest-environment jsdom
 *
 * JS-7 (D-JS2): the Pathway page reads the roadmap engine. With the server's
 * goal_targets switch off the page is today's page — template skill ladders,
 * no target action, no targets request. With it on, the ladders go, each
 * suggested role can be made a target (fit detail read first, then the
 * target), and the person's roadmaps render from `/goal-targets/mine`.
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { FitDetail, FitPathway } from "@/types/job-fit"
import type { GoalTargetWithRoadmap } from "@/types/goals/targets"

const mockSwitch = jest.fn()
jest.mock("@/services/switches/goalTargets.service", () => ({
  getGoalTargetsEnabled: () => mockSwitch(),
}))
const mockMine = jest.fn()
const mockMake = jest.fn()
jest.mock("@/services/goals/targets.service", () => ({
  makeTarget: (body: unknown) => mockMake(body),
  getMyTargets: () => mockMine(),
  getRoadmap: jest.fn(),
  rebuildRoadmap: jest.fn(),
  removeTarget: jest.fn(),
}))
const mockDetail = jest.fn()
jest.mock("@/services/job-fit/fit.service", () => ({
  fitService: { getDetail: (...args: unknown[]) => mockDetail(...args) },
}))
const mockPathway = jest.fn()
jest.mock("@/hooks/job-fit/useFitPathway", () => ({ useFitPathway: () => mockPathway() }))

import PathwayPage from "../PathwayPage"

const PATHWAY: FitPathway = {
  suggestions: [
    { roleTitle: "Operations Manager", roleFamily: "Ops", pivotDifficulty: "moderate", rationale: "Within reach.", jobId: "j1" },
    { roleTitle: "Sales Lead", pivotDifficulty: "high", jobId: "j2" },
    { roleTitle: "Unpublished role", jobId: null },
  ],
  skillLadders: [
    {
      skill: "Decisiveness",
      steps: [
        "Notice where decisiveness shows up in your current work.",
        "Take on a low-stakes task that stretches your decisiveness.",
        "Ask for feedback and a bigger decisiveness assignment.",
      ],
    },
  ],
  note: "Your career pathway highlights roles you're developing toward.",
}

const DETAIL: FitDetail = {
  jobId: "j1",
  roleTitle: "Operations Manager",
  tier: "strong-fit",
  baseTier: "strong-fit",
  totalVariation: 22,
  fitScore: 64,
  perDimension: [
    { category: "core-trait", dimensionId: 3, dimensionName: "Decisiveness", candidateScore: 40, benchmarkScore: 65, gap: -25, coaching: "" },
  ],
  criticalGaps: [{ dimensionName: "Decisiveness", category: "core-trait", gap: -25 }],
  coachingGaps: [{ dimensionName: "Decisiveness", category: "core-trait", gap: -25 }],
  overdoneFlags: [],
  interviewSelfAdvocacy: [],
  methodologyNote: "",
}

const TARGET_J1: GoalTargetWithRoadmap = {
  targetId: "t1",
  goalId: "g1",
  memberId: "m",
  jobId: "j1",
  roleTitle: "Operations Manager",
  fitSnapshot: {},
  createdAt: null,
  updatedAt: null,
  roadmap: {
    roadmapId: "r1",
    goalId: "g1",
    targetId: "t1",
    engineVersion: "goal-roadmap/1",
    supersededAt: null,
    createdAt: null,
    roadmap: {
      engineVersion: "goal-roadmap/1",
      wording: "deterministic",
      goalId: "g1",
      goalTitle: "Move into Operations Manager",
      targetRole: { title: "Operations Manager", blueprintId: "j1" },
      fitScore: 64,
      start: { firstStep: null, pending: true },
      milestones: [
        {
          itemId: "i1", gapId: "gap-1", competency: "Decisiveness", title: "Close the Decisiveness gap",
          source: "behavioral", severity: "critical", rank: 1, direction: "below",
          currentScore: 40, targetScore: 65, magnitude: 25, format: "practice",
          why: "The role benchmarks Decisiveness at 65; you scored 40.",
          canon: { section: "core", dimension: "Decisiveness", definition: "Commits to a course of action.", descriptors: "" },
        },
      ],
      finish: { successMetric: "Offer in hand", pending: false },
      gapsPending: false,
      advisories: { overdone: [] },
      learningFormat: "practice",
      sequenceBasis: "Priority gaps first, then the largest miss.",
      note: "",
    },
  },
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/vertical/job-fit/pathway"]}>
        <PathwayPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPathway.mockReturnValue({ data: PATHWAY, isLoading: false, isError: false })
  mockMine.mockResolvedValue([])
  mockDetail.mockResolvedValue({ data: { data: DETAIL } })
  mockMake.mockResolvedValue({
    goal: { goalId: "g1", title: "Move into Operations Manager" },
    target: { ...TARGET_J1, roadmap: undefined },
    roadmap: TARGET_J1.roadmap,
  })
})

describe("switch OFF — today's page", () => {
  test("template skill ladders render, no target action, no targets request", async () => {
    mockSwitch.mockResolvedValue(false)
    renderPage()
    // The explainer bullet and the section title both say it.
    expect(screen.getAllByText("Skill ladders")).toHaveLength(2)
    expect(screen.getByText(/notice where decisiveness shows up/i)).toBeInTheDocument()
    await waitFor(() => expect(mockSwitch).toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: /make .* my target/i })).not.toBeInTheDocument()
    expect(screen.queryByText("Your roadmaps")).not.toBeInTheDocument()
    expect(mockMine).not.toHaveBeenCalled()
    expect(mockDetail).not.toHaveBeenCalled()
  })
})

describe("switch ON — the roadmap engine", () => {
  beforeEach(() => mockSwitch.mockResolvedValue(true))

  test("the three template sentences go; a target action per suggested role with a jobId", async () => {
    renderPage()
    expect(await screen.findByText("Your roadmaps")).toBeInTheDocument()
    expect(screen.queryByText("Skill ladders")).not.toBeInTheDocument()
    expect(screen.queryByText(/notice where decisiveness shows up/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/low-stakes task/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/bigger decisiveness assignment/i)).not.toBeInTheDocument()
    await waitFor(() => expect(mockMine).toHaveBeenCalled())
    expect(screen.getByRole("button", { name: "Make Operations Manager my target" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Make Sales Lead my target" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /unpublished role/i })).not.toBeInTheDocument()
    expect(screen.getByText(/haven't targeted a role yet/i)).toBeInTheDocument()
  })

  test("making a role the target reads its fit first, then posts that fit as the snapshot", async () => {
    const user = userEvent.setup()
    renderPage()
    const button = await screen.findByRole("button", { name: "Make Operations Manager my target" })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    await waitFor(() => expect(mockMake).toHaveBeenCalledTimes(1))
    expect(mockDetail).toHaveBeenCalledWith("j1", "gap")
    expect(mockMake).toHaveBeenCalledWith({ jobId: "j1", fitSnapshot: DETAIL })
    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent(/“Move into Operations Manager” now targets Operations Manager/)
    expect(within(status).getByRole("link", { name: /view roadmap/i })).toHaveAttribute("href", "/my/goals/g1/roadmap")
    expect(mockMine).toHaveBeenCalledTimes(2) // invalidated after the write
  })

  test("a role already targeted offers its roadmap, not a second create; the roadmap renders", async () => {
    mockMine.mockResolvedValue([TARGET_J1])
    renderPage()
    const already = await screen.findByTestId("already-targeted")
    expect(within(already).getByRole("link", { name: /view roadmap/i })).toHaveAttribute("href", "/my/goals/g1/roadmap")
    expect(screen.queryByRole("button", { name: "Make Operations Manager my target" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Make Sales Lead my target" })).toBeInTheDocument()

    const roadmap = screen.getByTestId("pathway-roadmap")
    expect(roadmap).toHaveTextContent("Move into Operations Manager")
    expect(roadmap).toHaveTextContent("Close the Decisiveness gap")
    expect(roadmap).toHaveTextContent("Priority")
    expect(roadmap).toHaveTextContent("benchmarks Decisiveness at 65")
    expect(roadmap).toHaveTextContent("Decisiveness in PRISM: Commits to a course of action.")
    expect(roadmap).toHaveTextContent("No first step on this goal yet")
    expect(roadmap).not.toHaveTextContent("No success measure")
    expect(within(roadmap).getByRole("link", { name: /full roadmap/i })).toHaveAttribute("href", "/my/goals/g1/roadmap")
    expect(screen.queryByText(/haven't targeted a role yet/i)).not.toBeInTheDocument()
  })

  test("a roadmap with no gaps says so rather than listing steps", async () => {
    mockMine.mockResolvedValue([
      {
        ...TARGET_J1,
        roadmap: { ...TARGET_J1.roadmap!, roadmap: { ...TARGET_J1.roadmap!.roadmap, gapsPending: true, milestones: [] } },
      },
    ])
    renderPage()
    const roadmap = await screen.findByTestId("pathway-roadmap")
    expect(roadmap).toHaveTextContent(/showed no gaps to close/i)
    expect(within(roadmap).queryByRole("list")).not.toBeInTheDocument()
  })

  test("a failed fit read is said and nothing is written", async () => {
    const user = userEvent.setup()
    mockDetail.mockRejectedValue({ response: { status: 404, data: { detail: "Blueprint not found" } } })
    renderPage()
    const button = await screen.findByRole("button", { name: "Make Operations Manager my target" })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    expect(await screen.findByRole("alert")).toHaveTextContent("Blueprint not found")
    expect(mockMake).not.toHaveBeenCalled()
  })

  test("a refused write is said in words a person can read", async () => {
    const user = userEvent.setup()
    mockMake.mockRejectedValue({ response: { status: 403, data: {} } })
    renderPage()
    const button = await screen.findByRole("button", { name: "Make Sales Lead my target" })
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    expect(await screen.findByRole("alert")).toHaveTextContent(/aren't available on your account/i)
  })

  test("a failed targets read is said; the action stays, since a create reuses the goal", async () => {
    mockMine.mockRejectedValue({ response: { status: 500 } })
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load your roadmaps/i)
    const button = screen.getByRole("button", { name: "Make Operations Manager my target" })
    await waitFor(() => expect(button).toBeEnabled())
  })

  test("roadmaps render even with no suggestions — a target made from the fit page", async () => {
    mockPathway.mockReturnValue({ data: { suggestions: [], skillLadders: [], note: "Nothing adjacent." }, isLoading: false, isError: false })
    mockMine.mockResolvedValue([TARGET_J1])
    renderPage()
    expect(screen.getByText("Nothing adjacent.")).toBeInTheDocument()
    expect(await screen.findByTestId("pathway-roadmap")).toHaveTextContent("Close the Decisiveness gap")
  })
})
