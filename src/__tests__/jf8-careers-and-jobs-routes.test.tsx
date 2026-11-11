/**
 * JF-8 — every Career Fit and Career & Education Discovery URL still lands.
 *
 * Walks the REAL route table (`routes.tsx`), not a copied list: it takes the
 * `/vertical/job-fit` and `/vertical/career-discovery` subtrees, expands every
 * path in them, and renders each one with `job_fit_v2` off and on. Every path
 * must end on a page — never on the catch-all — and with the switch off it must
 * end on exactly the page it ends on today.
 *
 * The walker asserts it found every path that existed before JF-8 (BASE_PATHS,
 * read off the table at frontend 3adb3e06), so dropping a route fails here
 * rather than passing over nothing.
 */
import type { ReactElement } from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Outlet, useRoutes, type RouteObject } from "react-router-dom"
import { routes } from "@/routes"
import { CAREERS_AND_JOBS_PATH } from "@/constants/vertical-subnav"

let mockV2 = false
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({ useSavedJobsEnabled: () => mockV2 }))

let mockEntitled: string[] = []
jest.mock("@/verticals/core", () => {
  const actual = jest.requireActual("@/verticals/core")
  const { Outlet: RouterOutlet } = jest.requireActual("react-router-dom")
  return {
    ...actual,
    VerticalShell: () => <RouterOutlet />,
    useVerticalAccess: (key: string) => ({
      hasAccess: mockEntitled.includes(key),
      isLoading: false,
      enabledVerticals: mockEntitled,
    }),
  }
})

// Layouts are pass-through; each page renders its own name.
jest.mock("@/pages/job-fit/JobFitLayout", () => ({ __esModule: true, default: () => <Outlet /> }))
jest.mock("@/pages/job-fit/FitShell", () => ({ __esModule: true, default: () => <Outlet /> }))
jest.mock("@/pages/career-discovery/DiscoveryShell", () => ({ __esModule: true, default: () => <Outlet /> }))
const stub = (name: string) => ({ __esModule: true, default: () => <p>PAGE:{name}</p> })
jest.mock("@/pages/job-fit/JobFitHome", () => stub("careers-and-jobs"))
jest.mock("@/pages/job-fit/MatchesPage", () => stub("job-fit/matches"))
jest.mock("@/pages/job-fit/FitDetailPage", () => stub("job-fit/detail"))
jest.mock("@/pages/job-fit/GapsPage", () => stub("job-fit/gaps"))
jest.mock("@/pages/job-fit/PathwayPage", () => stub("job-fit/pathway"))
jest.mock("@/pages/job-fit/CareerProfilePage", () => stub("job-fit/profile"))
jest.mock("@/pages/job-fit/BlueprintStudioPage", () => stub("job-fit/blueprint"))
jest.mock("@/pages/job-fit/CoachPage", () => stub("job-fit/coach"))
jest.mock("@/pages/job-fit/TargetPreviewPage", () => stub("job-fit/target"))
jest.mock("@/pages/job-fit/FitHistoryPage", () => stub("job-fit/history"))
jest.mock("@/pages/career-discovery/JourneyPage", () => stub("discovery/journey"))
jest.mock("@/pages/career-discovery/AboutPage", () => stub("discovery/about"))
jest.mock("@/pages/career-discovery/WhoPage", () => stub("discovery/who"))
jest.mock("@/pages/career-discovery/CareersPage", () => stub("discovery/careers"))
jest.mock("@/pages/career-discovery/PaysPage", () => stub("discovery/pays"))
jest.mock("@/pages/career-discovery/GoalsPage", () => stub("discovery/goals"))
jest.mock("@/pages/career-discovery/AlignmentPage", () => stub("discovery/alignment"))
jest.mock("@/pages/career-discovery/EducationPage", () => stub("discovery/education"))
jest.mock("@/pages/career-discovery/CostPage", () => stub("discovery/cost"))
jest.mock("@/pages/career-discovery/PlanPage", () => stub("discovery/plan"))
jest.mock("@/pages/career-discovery/DegreePlanPage", () => stub("discovery/degree-plan"))
jest.mock("@/pages/career-exercise/CareerExercisePage", () => stub("career-exercise"))

const ROOTS = ["/vertical/job-fit", "/vertical/career-discovery"]

function findRoute(list: RouteObject[], path: string): RouteObject | undefined {
  for (const r of list) {
    if (r.path === path) return r
    const hit = findRoute(r.children ?? [], path)
    if (hit) return hit
  }
  return undefined
}

/** Every concrete URL a subtree serves: index routes as the parent, params filled. */
function expand(route: RouteObject, base: string): string[] {
  const here = route.path ? (route.path.startsWith("/") ? route.path : `${base}/${route.path}`) : base
  const own = route.index || (route.path && !route.children?.length) ? [here] : []
  return [...own, ...(route.children ?? []).flatMap((c) => expand(c, here))]
}
const fill = (p: string) => p.replace(":jobId", "job-1").replace(":snapshotId", "snap-1")

const SUBTREES = ROOTS.map((p) => findRoute(routes, p)).filter((r): r is RouteObject => !!r)
const FOUND = SUBTREES.flatMap((r) => expand(r, "")).map(fill)

/** Today's pages, by URL — what every path renders before JF-8 and with the switch off. */
const TODAY: Record<string, string> = {
  "/vertical/job-fit": "job-fit/matches",
  "/vertical/job-fit/matches": "job-fit/matches",
  "/vertical/job-fit/fit/job-1": "job-fit/detail",
  "/vertical/job-fit/history/snap-1": "job-fit/history",
  "/vertical/job-fit/gaps": "job-fit/gaps",
  "/vertical/job-fit/pathway": "job-fit/pathway",
  "/vertical/job-fit/profile": "job-fit/profile",
  "/vertical/job-fit/blueprint": "job-fit/blueprint",
  "/vertical/job-fit/coach": "job-fit/coach",
  "/vertical/job-fit/target": "job-fit/target",
  "/vertical/career-discovery": "discovery/journey",
  "/vertical/career-discovery/journey": "discovery/journey",
  "/vertical/career-discovery/about": "discovery/about",
  "/vertical/career-discovery/who": "discovery/who",
  "/vertical/career-discovery/careers": "discovery/careers",
  "/vertical/career-discovery/pays": "discovery/pays",
  "/vertical/career-discovery/goals": "discovery/goals",
  "/vertical/career-discovery/alignment": "discovery/alignment",
  "/vertical/career-discovery/education": "discovery/education",
  "/vertical/career-discovery/cost": "discovery/cost",
  "/vertical/career-discovery/plan": "discovery/plan",
  "/vertical/career-discovery/degree-plan": "discovery/degree-plan",
}
const BASE_PATHS = Object.keys(TODAY)

/** With job_fit_v2 on (and both entitlements), what changes. Everything else is TODAY. */
const MOVED: Record<string, string> = {
  "/vertical/job-fit": "careers-and-jobs",
  "/vertical/job-fit/matches": "careers-and-jobs",
  "/vertical/job-fit/gaps": "careers-and-jobs",
  "/vertical/job-fit/home": "careers-and-jobs",
  "/vertical/career-discovery/careers": "careers-and-jobs",
}

/** Paths added after JF-8 (not today's, not moved): where each lands, switch on or off. */
const ADDED: Record<string, string> = {
  // CX-5 — its own `career_exercise` gate lives inside the page.
  "/vertical/career-discovery/exercise": "career-exercise",
}

function Routes(): ReactElement | null {
  return useRoutes([...SUBTREES, { path: "*", element: <p>NO-MATCH</p> }])
}

async function landOn(url: string): Promise<string> {
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <Routes />
    </MemoryRouter>,
  )
  const el = await screen.findByText(/^PAGE:|^NO-MATCH$/)
  const text = el.textContent ?? ""
  view.unmount()
  return text.replace(/^PAGE:/, "")
}

beforeEach(() => {
  mockV2 = false
  mockEntitled = ["job-fit", "career-discovery"]
})

describe("JF-8 — the route walker", () => {
  it("walks the real table and finds every path that existed before JF-8", () => {
    expect(SUBTREES).toHaveLength(2)
    expect(FOUND.length).toBeGreaterThanOrEqual(BASE_PATHS.length + 1) // + /home
    expect(BASE_PATHS.length).toBe(22)
    for (const p of BASE_PATHS) expect(FOUND).toContain(p)
  })

  it("the menu's Careers and Jobs path is the route's path", () => {
    expect(FOUND).toContain(CAREERS_AND_JOBS_PATH)
  })
})

describe("JF-8 — job_fit_v2 OFF: every URL lands where it does today", () => {
  it.each(BASE_PATHS)("%s", async (url) => {
    expect(await landOn(url)).toBe(TODAY[url])
  })

  it("the new /home path is not a page while off: it sends you to My fit", async () => {
    expect(await landOn("/vertical/job-fit/home")).toBe("job-fit/matches")
  })

  it("every path the walker found lands on a page (nothing 404s)", async () => {
    for (const url of FOUND) expect(await landOn(url)).not.toBe("NO-MATCH")
  })
})

describe("JF-8 — job_fit_v2 ON", () => {
  beforeEach(() => {
    mockV2 = true
  })

  it.each(FOUND)("%s lands on its new home (or stays put)", async (url) => {
    expect(await landOn(url)).toBe(MOVED[url] ?? TODAY[url] ?? ADDED[url])
  })

  it("a Discovery-only account keeps today's Career areas (no bounce into Career Fit)", async () => {
    mockEntitled = ["career-discovery"]
    expect(await landOn("/vertical/career-discovery/careers")).toBe("discovery/careers")
  })

  it("Direction Setting is not in this change (F-11)", () => {
    expect(FOUND.some((p) => p.startsWith("/vertical/direction-setting"))).toBe(false)
  })
})
