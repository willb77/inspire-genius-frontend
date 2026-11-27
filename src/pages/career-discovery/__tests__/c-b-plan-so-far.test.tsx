/**
 * @jest-environment jsdom
 *
 * Careers and Jobs Phase C-b — "Your plan so far" on the Discovery plan page.
 * CSA: docs/analysis/2026-11-26-careers-jobs-c-b-plan-block-build-csa.md (monorepo).
 *
 * Tries to disprove (CSA guards 1-9):
 *  1. switch off: a block, or any new request (degree plan, goal-targets
 *     switch, targets), or any DOM change to the plan page;
 *  2. a Discovery-only account (no job-fit) asks for, or shows, targets —
 *     the server's GET /goal-targets/mine does not check the entitlement;
 *  3. goal targets off still reads targets;
 *  4. the degree plan read without the education stage, or a line for a plan
 *     that is not there (available:false, plan:null, refused, a 403);
 *  5. a cost figure in the block;
 *  6. a failed block read hides today's plan;
 *  7. an empty card when nothing applies;
 *  8. wrong links, or more than three targets;
 *  9. missing under house style.
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import * as targetsSvc from "@/services/goals/targets.service"
import * as switchSvc from "@/services/switches/goalTargets.service"
import type { DegreePlan, DiscoveryJourney, DiscoveryStage } from "@/types/career-discovery"
import type { GoalTargetWithRoadmap } from "@/types/goals/targets"

let mockFlow = false
jest.mock("@/hooks/careers-jobs/useCareersJobsFlow", () => ({ useCareersJobsFlow: () => mockFlow }))

let mockEntitled: string[] = []
jest.mock("@/verticals/core", () => {
  const actual = jest.requireActual("@/verticals/core")
  return {
    ...actual,
    useVerticalAccess: (key: string) => ({
      hasAccess: mockEntitled.includes(key),
      isLoading: false,
      enabledVerticals: mockEntitled,
    }),
  }
})

let mockHouse = false
jest.mock("@/lib/house/areaSwitch", () => ({ isHouseStyleOn: () => mockHouse }))
jest.mock("@/pages/career-discovery/house/HouseDiscoveryNav", () => ({
  HouseDiscoveryNav: () => <nav aria-label="HOUSE-NAV" />,
}))
jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/services/goals/targets.service")
jest.mock("@/services/switches/goalTargets.service")
jest.mock("@/hooks/career-discovery/useProfileMerged", () => ({ useProfileMerged: () => false }))

import DiscoveryShell from "@/pages/career-discovery/DiscoveryShell"
import PlanPage from "@/pages/career-discovery/PlanPage"

const m = svc as jest.Mocked<typeof svc>
const tg = targetsSvc as jest.Mocked<typeof targetsSvc>
const sw = switchSvc as jest.Mocked<typeof switchSvc>
const ok = <T,>(data: T) => Promise.resolve({ status: true, data })

const CD = "/vertical/career-discovery"
const BOTH = ["career-discovery", "job-fit"]
const DISCOVERY_ONLY = ["career-discovery"]

function stages(educationOn = true): DiscoveryStage[] {
  return ["land", "about", "careers", "education", "plan"].map((id) => ({
    id,
    name: `Stage ${id}`,
    question: `Question for ${id}?`,
    outcome: "",
    available: id === "education" ? educationOn : true,
  }))
}

function journey(over: Partial<DiscoveryJourney> = {}): DiscoveryJourney {
  const list = stages()
  return {
    ageBand: "18_plus",
    ageFloor: 13,
    mayProceed: true,
    schoolLevel: null,
    interests: [],
    stageStatus: { plan: "complete" },
    stages: list,
    // Points at a page other than the plan, so C-a's card shows above it too.
    nextAction: { ...list[2], id: "careers" },
    artefactKeys: [],
    createdAt: null,
    updatedAt: null,
    ...over,
  }
}

const DISCOVERY_PLAN = {
  schoolLevel: "high_school",
  interests: ["art"],
  careerAreas: [],
  goalsCount: 1,
  alignment: null,
  nextSteps: [],
  comingNext: [],
}

function degreePlan(over: Record<string, unknown> = {}): DegreePlan {
  return {
    available: true,
    reason: null,
    note: null,
    plan: {
      refused: null,
      programs: [{ id: "p1", code: "BIO", title: "Biology BS", credential: "BS" }],
      termsLeft: 5,
      expectedCompletion: { year: 2029, season: "spring", label: "Spring 2029" },
    },
    costToFinish: { available: true, terms: 5, low: 41000, high: 52000, perTerm: { low: 8200, high: 10400 } },
    ...over,
  } as unknown as DegreePlan
}

function target(n: number): GoalTargetWithRoadmap {
  return {
    targetId: `t${n}`,
    goalId: `g${n}`,
    memberId: "m",
    jobId: `j${n}`,
    roleTitle: `Invented Role ${n}`,
    fitSnapshot: {},
    createdAt: null,
    updatedAt: null,
    roadmap: null,
  }
}

function renderPlan() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`${CD}/plan`]}>
        <Routes>
          <Route path={CD} element={<DiscoveryShell />}>
            <Route path="plan" element={<PlanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const BLOCK = "Your plan so far"
const block = () => screen.queryByText(BLOCK)
const blockCard = () => block()?.closest('[data-slot="card"]') as HTMLElement

beforeEach(() => {
  mockFlow = false
  mockEntitled = BOTH
  mockHouse = false
  jest.clearAllMocks()
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }) as never)
  m.getDiscoveryJourney.mockReturnValue(ok(journey()) as never)
  m.getDiscoveryPlan.mockReturnValue(ok(DISCOVERY_PLAN) as never)
  m.advanceDiscovery.mockReturnValue(ok(journey()) as never)
  m.getDegreePlan.mockReturnValue(ok(degreePlan()) as never)
  sw.getGoalTargetsEnabled.mockResolvedValue(true)
  tg.getMyTargets.mockResolvedValue([target(1)])
})

async function pageReady() {
  expect(await screen.findByText("High school")).toBeInTheDocument()
}

describe("guard 1: switch off", () => {
  test("no block and no new request; the plan page DOM is as before C-b", async () => {
    const { container } = renderPlan()
    await pageReady()
    expect(block()).toBeNull()
    expect(m.getDegreePlan).not.toHaveBeenCalled()
    expect(sw.getGoalTargetsEnabled).not.toHaveBeenCalled()
    expect(tg.getMyTargets).not.toHaveBeenCalled()
    expect(container.innerHTML).toMatchSnapshot("plan-off")
  })
})

describe("switch on", () => {
  beforeEach(() => {
    mockFlow = true
  })

  test("both sources: the degree plan and the targets, each linked", async () => {
    renderPlan()
    await pageReady()
    const card = await screen.findByText("Invented Role 1").then(() => blockCard())
    expect(within(card).getByRole("link", { name: "Degree plan: Biology BS" })).toHaveAttribute(
      "href",
      `${CD}/degree-plan`
    )
    expect(within(card).getByText("Terms left: 5. Finishing Spring 2029.")).toBeInTheDocument()
    expect(within(card).getByRole("link", { name: "Invented Role 1" })).toHaveAttribute("href", "/my/goals/g1/roadmap")
  })

  test("the block sits above today's plan content", async () => {
    renderPlan()
    await screen.findByText("Invented Role 1")
    const where = screen.getByText("Where you are")
    expect(block()!.compareDocumentPosition(where) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("guard 2: Discovery only — no goal-targets request, no targets request, no target line", async () => {
    mockEntitled = DISCOVERY_ONLY
    renderPlan()
    await pageReady()
    expect(await screen.findByText("Degree plan: Biology BS")).toBeInTheDocument()
    expect(sw.getGoalTargetsEnabled).not.toHaveBeenCalled()
    expect(tg.getMyTargets).not.toHaveBeenCalled()
    expect(screen.queryByText("Invented Role 1")).toBeNull()
    expect(screen.queryByText("Roles you're working toward")).toBeNull()
  })

  test("guard 3: goal targets off — targets are not read", async () => {
    sw.getGoalTargetsEnabled.mockResolvedValue(false)
    renderPlan()
    await pageReady()
    expect(await screen.findByText("Degree plan: Biology BS")).toBeInTheDocument()
    expect(sw.getGoalTargetsEnabled).toHaveBeenCalled()
    expect(tg.getMyTargets).not.toHaveBeenCalled()
  })

  test("guard 4: education unavailable — the degree plan is not read", async () => {
    const list = stages(false)
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ stages: list, nextAction: { ...list[2], id: "careers" } })) as never)
    renderPlan()
    await pageReady()
    expect(await screen.findByText("Invented Role 1")).toBeInTheDocument()
    expect(m.getDegreePlan).not.toHaveBeenCalled()
    expect(screen.queryByText(/^Degree plan:/)).toBeNull()
  })

  test.each([
    ["available:false", () => ok({ available: false, reason: "catalogs", note: "n", plan: null })],
    ["plan:null", () => ok({ available: true, reason: "no_program", note: "n", plan: null })],
    // The engine refused but still names the program: the refusal must win.
    ["refused", () => ok(degreePlan({ plan: { refused: { code: "x", names: [], statement: "s" }, programs: [{ title: "Biology BS" }], termsLeft: 5 } }))],
    // Defensive: a payload that says unavailable must not be shown even if a plan rides along.
    ["available:false with a plan", () => ok(degreePlan({ available: false }))],
    ["403", () => Promise.reject(Object.assign(new Error("off"), { response: { status: 403 } }))],
  ])("guard 4: %s — no degree-plan line, no error", async (_name, reply) => {
    m.getDegreePlan.mockReturnValue(reply() as never)
    renderPlan()
    await pageReady()
    expect(await screen.findByText("Invented Role 1")).toBeInTheDocument()
    expect(screen.queryByText(/^Degree plan:/)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  test("guard 5: no cost figure in the block", async () => {
    renderPlan()
    await screen.findByText("Degree plan: Biology BS")
    expect(blockCard().textContent).not.toMatch(/\$|41,?000|52,?000|8,?200|10,?400|cost/i)
  })

  test.each([
    ["targets 500", () => tg.getMyTargets.mockRejectedValue(Object.assign(new Error("x"), { response: { status: 500 } }))],
    ["degree plan 500", () => m.getDegreePlan.mockReturnValue(Promise.reject(Object.assign(new Error("x"), { response: { status: 500 } })) as never)],
  ])("guard 6: %s leaves today's plan in place", async (_name, fail) => {
    fail()
    renderPlan()
    await pageReady()
    expect(screen.getByText("Where you are")).toBeInTheDocument()
    expect(screen.getByText("Into: art")).toBeInTheDocument()
  })

  test("guard 7: nothing applies — no card, and the page is as before C-b", async () => {
    m.getDegreePlan.mockReturnValue(ok({ available: true, reason: "no_program", note: "n", plan: null }) as never)
    tg.getMyTargets.mockResolvedValue([])
    const { container } = renderPlan()
    await pageReady()
    // Let both block reads settle before comparing (the read itself is
    // asserted in "guard 7 reads" below; this snapshot predates the block).
    await screen.findByText("Next: Stage careers")
    await new Promise((r) => setTimeout(r, 50))
    expect(block()).toBeNull()
    expect(container.innerHTML).toMatchSnapshot("plan-on-nothing")
  })

  test("guard 7 reads: with nothing to show, both sources were still asked", async () => {
    m.getDegreePlan.mockReturnValue(ok({ available: true, reason: "no_program", note: "n", plan: null }) as never)
    tg.getMyTargets.mockResolvedValue([])
    renderPlan()
    await pageReady()
    await waitFor(() => expect(tg.getMyTargets).toHaveBeenCalled())
    expect(m.getDegreePlan).toHaveBeenCalled()
    expect(block()).toBeNull()
  })

  test("guard 8: at most three targets, each to its own roadmap", async () => {
    tg.getMyTargets.mockResolvedValue([target(1), target(2), target(3), target(4)])
    renderPlan()
    await screen.findByText("Invented Role 1")
    const links = within(blockCard()).getAllByRole("link").filter((a) => a.textContent?.startsWith("Invented Role"))
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/my/goals/g1/roadmap",
      "/my/goals/g2/roadmap",
      "/my/goals/g3/roadmap",
    ])
  })

  test("guard 9: the block renders under house style", async () => {
    mockHouse = true
    renderPlan()
    expect(await screen.findByText("Invented Role 1")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "HOUSE-NAV" })).toBeInTheDocument()
    expect(block()).toBeInTheDocument()
  })

  test("a degree plan with no term count shows the program only", async () => {
    m.getDegreePlan.mockReturnValue(ok(degreePlan({ plan: { refused: null, programs: [{ title: "Biology BS" }] } })) as never)
    renderPlan()
    expect(await screen.findByText("Degree plan: Biology BS")).toBeInTheDocument()
    expect(screen.queryByText(/^Terms left/)).toBeNull()
  })

  test("a term count with no finish date", async () => {
    m.getDegreePlan.mockReturnValue(ok(degreePlan({ plan: { refused: null, programs: [{ title: "Biology BS" }], termsLeft: 2 } })) as never)
    renderPlan()
    expect(await screen.findByText("Terms left: 2.")).toBeInTheDocument()
  })
})

// O-CBW-b (2026-11-27, R2): the plan page's goals card counts this journey's
// goals step, not Goals Studio, and says so — it must not read "no goals" beside
// the Goals Studio targets listed above it.
describe("O-CBW-b: the journey goals card names its source", () => {
  test("no journey goals: the step is named and Goals Studio is one click away", async () => {
    m.getDiscoveryPlan.mockReturnValue(ok({ ...DISCOVERY_PLAN, goalsCount: 0 }) as never)
    renderPlan()
    await pageReady()
    expect(screen.getByText("Goals from this journey")).toBeInTheDocument()
    expect(screen.queryByText("Your goals")).toBeNull()
    expect(screen.queryByText(/No goals set yet/)).toBeNull()
    expect(screen.getByText(/You haven't done the goals step yet\./)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Goals Studio" })).toHaveAttribute("href", "/my/goals")
  })

  test("journey goals on file: the count, and no Goals Studio link", async () => {
    m.getDiscoveryPlan.mockReturnValue(ok({ ...DISCOVERY_PLAN, goalsCount: 2 }) as never)
    renderPlan()
    await pageReady()
    expect(screen.getByText("Goals from this journey")).toBeInTheDocument()
    expect(screen.getByText("2 goal(s) set.")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Open Goals Studio" })).toBeNull()
  })
})
