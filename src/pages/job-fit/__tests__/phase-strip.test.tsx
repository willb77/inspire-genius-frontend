/**
 * @jest-environment jsdom
 *
 * Careers and Jobs Phase B — the phase strip on both shells.
 *
 * Tries to disprove (CSA guard rails 1-6):
 *  - the strip shows with the switch off, loading or failing;
 *  - with the switch off either shell differs from today (an extra wrapper);
 *  - the strip links to a vertical the account lacks, for any of the four
 *    entitlement combinations, on either shell;
 *  - the strip sits inside Discovery's Gate (it must show on the under-13 and
 *    no-age pages, beside the server's refusal, which must still show);
 *  - a strip target is not a route that exists in the real route table.
 */
import { render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Outlet, Route, Routes, type RouteObject } from "react-router-dom"
import * as svc from "@/services/career-discovery/careerDiscovery.service"
import type { DiscoveryJourney } from "@/types/career-discovery"
import { PHASES, phaseItems, type PhaseVertical } from "@/lib/careers-jobs/phases"
import { CAREERS_AND_JOBS_PATH } from "@/constants/vertical-subnav"

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

jest.mock("@/pages/job-fit/FitNav", () => ({ __esModule: true, default: () => <nav aria-label="FIT-NAV" /> }))
jest.mock("@/services/career-discovery/careerDiscovery.service")
jest.mock("@/hooks/career-discovery/useProfileMerged", () => ({ useProfileMerged: () => false }))

import FitShell from "@/pages/job-fit/FitShell"
import DiscoveryShell from "@/pages/career-discovery/DiscoveryShell"

const m = svc as jest.Mocked<typeof svc>
const ok = <T,>(data: T) => Promise.resolve({ status: true, data })

const STRIP = "Your Careers and Jobs journey"
const CD = "/vertical/career-discovery"
const JF = "/vertical/job-fit"

function journey(over: Partial<DiscoveryJourney> = {}): DiscoveryJourney {
  return {
    ageBand: "13_17", ageFloor: 13, mayProceed: true, schoolLevel: null, interests: [],
    stageStatus: {}, stages: [], nextAction: null,
    artefactKeys: [], createdAt: null, updatedAt: null,
    ...over,
  } as DiscoveryJourney
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={JF} element={<FitShell />}>
            <Route path="home" element={<p>PAGE:jf-home</p>} />
            <Route path="matches" element={<p>PAGE:jf-matches</p>} />
          </Route>
          <Route path={CD} element={<DiscoveryShell />}>
            <Route path="journey" element={<p>PAGE:cd-journey</p>} />
            <Route path="careers" element={<p>PAGE:cd-careers</p>} />
            <Route path="goals" element={<p>PAGE:cd-goals</p>} />
            <Route path="education" element={<p>PAGE:cd-education</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function strip() {
  return screen.queryByRole("navigation", { name: STRIP })
}

function stripLinks(): Array<[string, string | null]> {
  const nav = strip()
  if (!nav) return []
  return within(nav)
    .getAllByRole("link")
    .map((a) => [a.textContent?.replace(/^\d+Step \d+ of \d+: /, "") ?? "", a.getAttribute("href")])
}

beforeEach(() => {
  mockFlow = false
  mockEntitled = []
  jest.clearAllMocks()
  m.getDiscoveryStatus.mockReturnValue(ok({ enabled: true }) as never)
  m.getDiscoveryJourney.mockReturnValue(ok(journey()) as never)
})

const COMBOS: Array<[string, string[]]> = [
  ["both", ["career-discovery", "job-fit"]],
  ["Discovery only", ["career-discovery"]],
  ["Careers and Jobs only", ["job-fit"]],
  ["neither", []],
]

/** What the strip must show for each combination, label → href. */
const EXPECTED: Record<string, Array<[string, string]>> = {
  both: [
    ["Know yourself", `${CD}/journey`],
    ["Explore careers", CAREERS_AND_JOBS_PATH],
    ["Check the fit", `${CD}/goals`],
    ["Plan the route", `${CD}/education`],
  ],
  "Discovery only": [
    ["Know yourself", `${CD}/journey`],
    ["Explore careers", `${CD}/careers`],
    ["Check the fit", `${CD}/goals`],
    ["Plan the route", `${CD}/education`],
  ],
  "Careers and Jobs only": [["Explore careers", CAREERS_AND_JOBS_PATH]],
  neither: [],
}

describe.each([
  ["Careers and Jobs shell", `${JF}/matches`, "PAGE:jf-matches"],
  ["Discovery shell", `${CD}/careers`, "PAGE:cd-careers"],
])("%s", (_shell, path, page) => {
  test.each(COMBOS)("switch OFF, %s: no strip, page as today", async (_name, keys) => {
    mockEntitled = keys
    mockFlow = false
    renderAt(path)
    expect(await screen.findByText(page)).toBeInTheDocument()
    expect(strip()).toBeNull()
    expect(document.querySelectorAll("nav")).toHaveLength(1)
  })

  test.each(COMBOS)("switch ON, %s: strip links only where the account can go", async (name, keys) => {
    mockEntitled = keys
    mockFlow = true
    renderAt(path)
    expect(await screen.findByText(page)).toBeInTheDocument()
    const want = EXPECTED[name]
    if (want.length === 0) {
      expect(strip()).toBeNull()
      return
    }
    expect(stripLinks()).toEqual(want)
    for (const [, href] of stripLinks()) {
      const needs = href?.startsWith(JF) ? "job-fit" : "career-discovery"
      expect(keys).toContain(needs)
    }
  })

  test("switch ON: the strip is drawn ABOVE the shell's own nav, which is unchanged", async () => {
    mockEntitled = ["career-discovery", "job-fit"]
    mockFlow = true
    renderAt(path)
    await screen.findByText(page)
    const navs = Array.from(document.querySelectorAll("nav"))
    expect(navs).toHaveLength(2)
    expect(navs[0].getAttribute("aria-label")).toBe(STRIP)
  })
})

describe("switch OFF leaves each shell's DOM exactly as without the strip", () => {
  test.each([`${JF}/matches`, `${CD}/careers`])("%s", async (path) => {
    mockEntitled = ["career-discovery", "job-fit"]
    mockFlow = false
    const { container } = renderAt(path)
    await screen.findByText(/^PAGE:/)
    const shell = container.firstElementChild as HTMLElement
    // The shell's first child is its own nav, exactly as before Phase B.
    expect(shell.firstElementChild?.tagName).toBe("NAV")
    expect(shell.firstElementChild?.getAttribute("aria-label")).not.toBe(STRIP)
  })
})

describe("current phase", () => {
  test.each([
    [`${JF}/matches`, "Explore careers"],
    [`${CD}/careers`, "Explore careers"],
    [`${CD}/goals`, "Check the fit"],
    [`${CD}/education`, "Plan the route"],
    [`${CD}/journey`, "Know yourself"],
  ])("%s marks %s", async (path, label) => {
    mockEntitled = ["career-discovery", "job-fit"]
    mockFlow = true
    renderAt(path)
    await screen.findByText(/^PAGE:/)
    const current = within(strip() as HTMLElement)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "step")
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent(label)
  })
})

describe("the strip sits outside Discovery's Gate; the server's refusals still show", () => {
  test("under 13: strip and the under-13 notice", async () => {
    mockEntitled = ["career-discovery", "job-fit"]
    mockFlow = true
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ ageBand: "under_13", mayProceed: false })) as never)
    renderAt(`${CD}/careers`)
    expect(await screen.findByText("Discovery is for ages 13 and over")).toBeInTheDocument()
    expect(strip()).not.toBeNull()
    expect(screen.queryByText("PAGE:cd-careers")).toBeNull()
  })

  test("no age range yet: strip and the first-step notice", async () => {
    mockEntitled = ["career-discovery"]
    mockFlow = true
    m.getDiscoveryJourney.mockReturnValue(ok(journey({ ageBand: null, mayProceed: false })) as never)
    renderAt(`${CD}/goals`)
    expect(await screen.findByText("Start on the first step")).toBeInTheDocument()
    expect(strip()).not.toBeNull()
  })

  test("Discovery switched off on the server: strip still drawn, the off notice still shown", async () => {
    mockEntitled = ["career-discovery"]
    mockFlow = true
    m.getDiscoveryStatus.mockReturnValue(ok({ enabled: false }) as never)
    renderAt(`${CD}/careers`)
    expect(await screen.findByText("Not switched on yet")).toBeInTheDocument()
    await waitFor(() => expect(strip()).not.toBeNull())
  })
})

describe("phaseItems", () => {
  const all = new Set<PhaseVertical>(["career-discovery", "job-fit"])

  test("an account with no entitlement gets no phase", () => {
    expect(phaseItems(new Set(), `${CD}/careers`)).toEqual([])
  })

  test("phases keep the owner's order", () => {
    expect(phaseItems(all, "/x").map((p) => p.key)).toEqual([
      "knowYourself",
      "exploreCareers",
      "checkTheFit",
      "planTheRoute",
    ])
  })

  test("no path outside both verticals is marked current", () => {
    expect(phaseItems(all, "/home").some((p) => p.current)).toBe(false)
  })
})

// ── every strip target is a route that exists today ──────────────────────────
jest.mock("@/pages/job-fit/JobFitLayout", () => ({ __esModule: true, default: () => <Outlet /> }))

describe("every strip target is served by the real route table", () => {
  test("each target resolves to a concrete route path", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded late, after the mocks above
    const { routes } = require("@/routes") as { routes: RouteObject[] }
    const find = (list: RouteObject[], p: string): RouteObject | undefined => {
      for (const r of list) {
        if (r.path === p) return r
        const hit = find(r.children ?? [], p)
        if (hit) return hit
      }
      return undefined
    }
    const expand = (r: RouteObject, base: string): string[] => {
      const here = r.path ? (r.path.startsWith("/") ? r.path : `${base}/${r.path}`) : base
      const own = r.index || (r.path && !r.children?.length) ? [here] : []
      return [...own, ...(r.children ?? []).flatMap((c) => expand(c, here))]
    }
    const served = new Set(
      [JF, CD].map((p) => find(routes, p)).filter((r): r is RouteObject => !!r).flatMap((r) => expand(r, ""))
    )
    expect(served.size).toBeGreaterThan(15)
    const targets = PHASES.flatMap((p) => p.targets.map((t) => t.to))
    expect(targets.length).toBeGreaterThanOrEqual(5)
    for (const to of targets) expect(served).toContain(to)
  })
})
