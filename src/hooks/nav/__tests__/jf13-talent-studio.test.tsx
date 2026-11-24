/**
 * @jest-environment jsdom
 *
 * JF-13 — Talent Studio, behind `job_fit_v2`.
 *
 * With the switch on, the Tools section for the three roles that have one
 * (super-admin, manager, practitioner) folds Career Studio, Interview Studio,
 * the role's Job Blueprint and Knowledge Continuity Studio into ONE "Talent
 * Studio" group. Only labels and grouping move.
 *
 * Three things are pinned here, all through the real `job_fit_v2` signal
 * (`useSavedJobsEnabled`, with only the HTTP call stubbed) and the real vertical
 * registry:
 *
 *   1. Off — status still loading, unreadable, or `false` — the Tools section is
 *      today's for all six roles. The snapshot in this file was recorded against
 *      the code BEFORE JF-13, so a passing run is the base-vs-branch identity.
 *   2. The role × route reachability diff: for every role, entitlement shape and
 *      Platform Alerts access, the set of destinations the sidebar reaches (and
 *      whether each is live or greyed) is the same with the switch on as off.
 *      The walker models SidebarScaffold, which renders ONE level of children:
 *      a destination nested deeper is unreachable and counted as missing.
 *   3. On — the shape of Talent Studio for the three role views.
 *
 * TS-3 (2026-11-23) changes two things here, both with the switch ON only:
 * the interview rows are named by purpose, and two existing pages the menu did
 * not list are added (question preparation; the manager's list of interviews
 * run). So the reachability diff is now "everything reached with the switch
 * off is still reached, and the ONLY extra destinations are the ones named in
 * TS3_ADDED". The off snapshot is untouched. The TS-3 block at the end pins the
 * rows, and that the house-style interview switch does not move the menu.
 *
 * TS-2 (2026-11-24) puts the group in the order the work runs, again with the
 * switch ON only: Overview, Roles, Candidates, Interviews, Insights, then
 * Knowledge Continuity as "Retain". Three destinations are added per role (the
 * role's Overview page, and the Candidates and Insights pages of the Role
 * Blueprints vertical, which copy that vertical's lock); they are named in
 * TS2_OVERVIEW and TS2_BLUEPRINT_PAGES and nothing else may appear. The off
 * snapshot is untouched. The TS-2 block at the end pins the exact order per role.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import "@/verticals"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"

type Mode = "loading" | "error" | "false" | "true"
let mockMode: Mode = "false"
jest.mock("@/services/job-fit/savedJobs.service", () => ({
  getSavedJobsEnabled: () => {
    if (mockMode === "loading") return new Promise<boolean>(() => {})
    if (mockMode === "error") return Promise.reject(new Error("status unreadable"))
    return Promise.resolve(mockMode === "true")
  },
  getSavedJobs: () => Promise.resolve([]),
  saveJob: jest.fn(),
  removeSavedJob: jest.fn(),
}))

const ALL_VERTICALS = [
  "grant",
  "honor",
  "job-blueprint",
  "job-fit",
  "knowledge-continuity",
  "lumen",
  "direction-setting",
  "career-discovery",
]
let mockEntitled: string[] | undefined = ALL_VERTICALS
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => ({ data: mockEntitled, isLoading: mockEntitled === undefined }),
}))
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))
jest.mock("@/hooks/super-admin/usePrismExam", () => ({ useExamAccess: () => ({ data: undefined }) }))
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: undefined }),
}))
let mockBroadcastAuthorized = false
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: mockBroadcastAuthorized } }),
}))

import { useToolsSection, TALENT_STUDIO_LABEL, TALENT_STUDIO_STAGE_ORDER } from "../useToolsSection"
import { hasAccess } from "@/types/roles"
import { navLabelKey } from "@/components/shared/layout/navLabels"
import { setHouseStyle } from "@/lib/house/areaSwitch"
import { useGatedNavItems } from "../useGatedNavItems"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
import {
  getUserNavItems,
  SUPER_ADMIN_NAV_SECTIONS,
  TALENT_STUDIO_INTERVIEW_ROWS,
  TALENT_STUDIO_INTERVIEW_TOOLS,
} from "@/constants/navigation"

const ROLES: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]
const TOOL_ROLES: UserRole[] = ["super-admin", "manager", "practitioner"]
const ENTITLEMENTS: Record<string, string[] | undefined> = {
  all: ALL_VERTICALS,
  none: [],
  loading: undefined,
}
const OFF_MODES: Mode[] = ["loading", "error", "false"]
const STATUS_KEY = ["saved-jobs", "enabled"]

async function clientFor(mode: Mode): Promise<QueryClient> {
  mockMode = mode
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (mode !== "loading") {
    const { getSavedJobsEnabled } = jest.requireMock("@/services/job-fit/savedJobs.service")
    await client.prefetchQuery({ queryKey: STATUS_KEY, queryFn: getSavedJobsEnabled })
  }
  return client
}

async function renderWith<T>(mode: Mode, hook: () => T): Promise<T> {
  const client = await clientFor(mode)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  const { result, unmount } = renderHook(hook, { wrapper })
  await act(async () => {})
  const value = result.current
  unmount()
  return value
}

const tools = (role: UserRole, mode: Mode) => renderWith(mode, () => useToolsSection(role))

/** Everything else in the role's sidebar — unchanged by JF-13, read with the same switch state. */
const restOfSidebar = (role: UserRole, mode: Mode) =>
  renderWith(mode, () => {
    const main = useGatedNavItems(role)
    const workspace = useWorkspaceNavItems(getUserNavItems(true))
    return role === "super-admin"
      ? [...workspace, ...SUPER_ADMIN_NAV_SECTIONS.flatMap((s) => s.items)]
      : main
  })

/** Text form: one line per row, children indented one step. */
function dump(items: NavItemDef[], depth = 0): string[] {
  return items.flatMap((i) => [
    `${"  ".repeat(depth)}${i.label} -> ${i.to || "(group)"}${i.disabled ? " (greyed)" : ""}`,
    ...dump(i.children ?? [], depth + 1),
  ])
}
const dumpSection = (s: NavSectionDef | null) =>
  s ? { label: s.label, defaultCollapsed: s.defaultCollapsed, items: dump(s.items) } : null

/**
 * route → reachable live (true) or only greyed (false). SidebarScaffold renders
 * a row and its children and nothing below that, so depth ≥ 2 is unreachable.
 */
function reach(items: NavItemDef[], into = new Map<string, boolean>()): Map<string, boolean> {
  const add = (i: NavItemDef) => {
    if (!i.to) return
    into.set(i.to, (into.get(i.to) ?? false) || !i.disabled)
  }
  for (const item of items) {
    add(item)
    for (const child of item.children ?? []) add(child)
  }
  return into
}

const sorted = (m: Map<string, boolean>) => [...m.entries()].sort(([a], [b]) => a.localeCompare(b))

/**
 * TS-3: the destinations the menu gains with the switch on, per role. Existing
 * routes under the role's own prefix; nothing else may appear.
 */
const TS3_ADDED: Partial<Record<UserRole, string[]>> = {
  manager: ["/manager/interview-prep", "/manager/interviews"],
  practitioner: ["/practitioner/interview-prep"],
}

/**
 * TS-2: the destinations the menu gains with the switch on. The role's own
 * Overview page is live. The two vertical pages are live exactly when the Role
 * Blueprints row is (greyed with it otherwise), so they are checked against
 * that row's state, not against a constant.
 */
const TS2_OVERVIEW: Partial<Record<UserRole, string>> = {
  manager: "/manager/talent-studio",
  practitioner: "/practitioner/talent-studio",
  "super-admin": "/super-admin/talent-studio",
}
const BLUEPRINT_HOME = "/vertical/job-blueprint/dashboard"
const TS2_BLUEPRINT_PAGES = ["/vertical/job-blueprint/candidates", "/vertical/job-blueprint/analytics"]

beforeEach(() => {
  localStorage.clear()
  mockEntitled = ALL_VERTICALS
  mockBroadcastAuthorized = false
})

describe("JF-13 — job_fit_v2 off: the Tools section is today's", () => {
  it.each(ROLES)("%s: loading, unreadable and false are one menu, and it is today's", async (role) => {
    const golden: Record<string, unknown> = {}
    for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
      for (const broadcast of [false, true]) {
        mockEntitled = list
        mockBroadcastAuthorized = broadcast
        const views = []
        for (const mode of OFF_MODES) views.push(dumpSection(await tools(role, mode)))
        expect(views[1]).toEqual(views[0])
        expect(views[2]).toEqual(views[0])
        golden[`${ent}/alerts=${broadcast}`] = views[0]
      }
    }
    expect(golden).toMatchSnapshot()
  })
})

describe("JF-13 — role × route reachability, before (off) and after (on)", () => {
  let pairs = 0
  let toolPairs = 0

  it.each(ROLES)(
    "%s: every destination reached today is still reached, live or greyed as today",
    async (role) => {
      for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
        mockEntitled = list
        for (const restMode of ["false", "true"] as Mode[]) {
          const rest = await restOfSidebar(role, restMode)
          for (const broadcast of [false, true]) {
            mockBroadcastAuthorized = broadcast
            const today = (await tools(role, "false"))?.items ?? []
            const before = reach([...rest, ...today])
            for (const mode of ["loading", "error", "true"] as Mode[]) {
              const after = reach([...rest, ...((await tools(role, mode))?.items ?? [])])
              // TS-3: with the switch on, exactly the named additions, each
              // live and none of them reached before; then the strict diff.
              const overview = TS2_OVERVIEW[role]
              const added = mode === "true" ? [...(TS3_ADDED[role] ?? []), ...(overview ? [overview] : [])] : []
              // TS-2: the two vertical pages, present only beside the Role
              // Blueprints row and in the same state as it.
              if (mode === "true" && overview) {
                expect({ role, ent, home: after.has(BLUEPRINT_HOME) }).toEqual({ role, ent, home: true })
                for (const route of TS2_BLUEPRINT_PAGES) {
                  expect({ role, ent, route, before: before.has(route), after: after.get(route) }).toEqual({
                    role,
                    ent,
                    route,
                    before: false,
                    after: after.get(BLUEPRINT_HOME),
                  })
                  after.delete(route)
                }
              }
              for (const route of added) {
                expect({ role, route, before: before.has(route), after: after.get(route) }).toEqual({
                  role,
                  route,
                  before: false,
                  after: true,
                })
                after.delete(route)
              }
              expect({ role, ent, restMode, broadcast, mode, routes: sorted(after) }).toEqual({
                role,
                ent,
                restMode,
                broadcast,
                mode,
                routes: sorted(before),
              })
            }
            pairs += before.size
            toolPairs += reach(today).size
          }
        }
      }
    },
    30_000,
  )

  it("walked every role (a walker over nothing proves nothing)", () => {
    // 6 roles × 3 entitlement shapes × 2 main-menu states × 2 alert states;
    // the Tools share is the three roles that have a Tools section.
    expect(pairs).toBeGreaterThanOrEqual(1500)
    expect(toolPairs).toBeGreaterThanOrEqual(400)
  })
})

describe("JF-13 — job_fit_v2 on: Talent Studio for the three role views", () => {
  const TOP_LEVEL_GONE = ["Career Studio", "Interview Studio", "Role Blueprint Match", "Knowledge Continuity Studio"]

  it.each(TOOL_ROLES)("%s: one Talent Studio group, nothing nested below one level", async (role) => {
    const section = await tools(role, "true")
    const items = section?.items ?? []
    const groups = items.filter((i) => i.label === TALENT_STUDIO_LABEL)
    expect(groups).toHaveLength(1)
    expect(groups[0].to).toBe("")
    for (const label of TOP_LEVEL_GONE) expect(items.map((i) => i.label)).not.toContain(label)
    const children = groups[0].children ?? []
    // Blueprint first, interview next, Knowledge Continuity last (as "Retain" since TS-2).
    const labels = children.map((c) => c.label)
    expect(labels.indexOf("Role Blueprints")).toBeGreaterThanOrEqual(0)
    expect(labels.indexOf("Role Blueprints")).toBeLessThan(labels.indexOf("Hiring interview"))
    expect(labels.indexOf("Hiring interview")).toBeLessThan(labels.indexOf("Own-questions interview"))
    expect(labels[labels.length - 1]).toBe("Retain: Knowledge Continuity")
    // SidebarScaffold renders one level of children; anything deeper is unreachable.
    expect(children.every((c) => !c.children?.length)).toBe(true)
    // Keys are `to || label`: unique across the whole section, children included.
    const keys = [...items, ...children].map((i) => i.to || i.label)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(["user", "company-admin", "distributor"] as UserRole[])(
    "%s: still has no Tools section, so no Talent Studio",
    async (role) => {
      expect(await tools(role, "true")).toBeNull()
    },
  )

  it("unentitled verticals stay greyed inside Talent Studio", async () => {
    mockEntitled = []
    const group = (await tools("manager", "true"))?.items.find((i) => i.label === TALENT_STUDIO_LABEL)
    const byLabel = Object.fromEntries((group?.children ?? []).map((c) => [c.label, !!c.disabled]))
    expect(byLabel).toEqual({
      Overview: false,
      "Role Blueprints": true,
      "Role Blueprint Match": false,
      Candidates: true,
      "Hiring interview": false,
      "Own-questions interview": false,
      "Prepare questions": false,
      "Past interviews": false,
      Insights: true,
      "Retain: Knowledge Continuity": true,
    })
  })

  it("the three role views, as rendered", async () => {
    const views: Record<string, unknown> = {}
    for (const role of TOOL_ROLES) views[role] = dumpSection(await tools(role, "true"))
    expect(views).toMatchSnapshot()
  })
})

describe("TS-3 — the interview rows in Talent Studio, named by purpose", () => {
  const EXPECTED: Record<string, [string, string][]> = {
    manager: [
      ["Hiring interview", "/manager/interview-live"],
      ["Own-questions interview", "/manager/interview-studio"],
      ["Prepare questions", "/manager/interview-prep"],
      ["Past interviews", "/manager/interviews"],
    ],
    practitioner: [
      ["Hiring interview", "/practitioner/interview-live"],
      ["Own-questions interview", "/practitioner/interview-studio"],
      ["Prepare questions", "/practitioner/interview-prep"],
    ],
    "super-admin": [
      ["Hiring interview", "/super-admin/interview-live"],
      ["Own-questions interview", "/super-admin/interview-studio"],
    ],
  }
  const OLD_LABELS = ["Interview Studio", "Live Interview"]
  const talentChildren = async (role: UserRole) =>
    (await tools(role, "true"))?.items.find((i) => i.label === TALENT_STUDIO_LABEL)?.children ?? []
  const isInterviewRoute = (to: string) => /\/interview(s$|-)/.test(to)

  it.each(TOOL_ROLES)("%s: one run of rows, in order, each to the role's own page", async (role) => {
    const children = await talentChildren(role)
    const at = children.findIndex((c) => isInterviewRoute(c.to))
    expect(at).toBeGreaterThan(-1)
    const want = EXPECTED[role]
    // Next to each other: the run starting at the first interview row IS the list.
    expect(children.slice(at, at + want.length).map((c) => [c.label, c.to])).toEqual(want)
    // And there is no interview row outside that run.
    expect(children.filter((c) => isInterviewRoute(c.to))).toHaveLength(want.length)
    for (const c of children.slice(at, at + want.length)) expect(c.disabled).toBeFalsy()
  })

  it.each(TOOL_ROLES)("%s: no destination and no label is listed twice, and the old names are gone", async (role) => {
    const section = await tools(role, "true")
    const children = await talentChildren(role)
    const tos = children.map((c) => c.to)
    const labels = children.map((c) => c.label)
    expect(new Set(tos).size).toBe(tos.length)
    expect(new Set(labels).size).toBe(labels.length)
    const everyLabel = (section?.items ?? []).flatMap((i) => [i.label, ...(i.children ?? []).map((c) => c.label)])
    for (const old of OLD_LABELS) expect(everyLabel).not.toContain(old)
  })

  it.each(TOOL_ROLES)("%s: both pages the group linked with the switch off are still linked, live", async (role) => {
    const off = (await tools(role, "false"))?.items.find((i) => i.label === "Interview Studio")
    const before = [off?.to, ...(off?.children ?? []).map((c) => c.to)]
    expect(before).toHaveLength(2)
    const after = new Map((await talentChildren(role)).map((c) => [c.to, !c.disabled]))
    for (const to of before) expect({ to, live: after.get(to as string) }).toEqual({ to, live: true })
  })

  it("every row is a route that exists, under the role's own prefix", () => {
    const routesSource = readFileSync(join(process.cwd(), "src/routes.tsx"), "utf8")
    let checked = 0
    for (const [role, rows] of Object.entries(EXPECTED)) {
      for (const [, to] of rows) {
        expect(to.startsWith(`/${role}/`)).toBe(true)
        expect({ to, routed: routesSource.includes(`path: "${to}"`) }).toEqual({ to, routed: true })
        checked++
      }
    }
    expect(checked).toBe(9)
  })

  it("every interview group that folds into Talent Studio has purpose rows", () => {
    expect(TALENT_STUDIO_INTERVIEW_TOOLS.size).toBe(3)
    expect(TALENT_STUDIO_INTERVIEW_ROWS).toHaveLength(3)
    for (const group of TALENT_STUDIO_INTERVIEW_TOOLS) {
      const rows = TALENT_STUDIO_INTERVIEW_ROWS.find(([g]) => g === group)?.[1] ?? []
      // At least the two pages the group already linked: itself and its child.
      const tos = rows.map((r) => r.to)
      expect(tos).toContain(group.to)
      for (const child of group.children ?? []) expect(tos).toContain(child.to)
      expect(rows.every((r) => !r.children?.length)).toBe(true)
    }
  })

  it.each(TOOL_ROLES)(
    "%s: the house-style interview switch does not move the menu, on or off, in any job_fit_v2 state",
    async (role) => {
      for (const mode of ["loading", "error", "false", "true"] as Mode[]) {
        localStorage.clear()
        const unset = dumpSection(await tools(role, mode))
        setHouseStyle("interview", true)
        expect(localStorage.getItem("house_style_interview")).toBe("true")
        const on = dumpSection(await tools(role, mode))
        setHouseStyle("interview", false)
        const offView = dumpSection(await tools(role, mode))
        expect(unset?.items.length).toBeGreaterThan(0)
        expect(on).toEqual(unset)
        expect(offView).toEqual(unset)
      }
    },
    30_000,
  )

  it("each new label has a menu translation in en, es, fr, pt, it, pl and cs", () => {
    const labels = [...new Set(Object.values(EXPECTED).flatMap((rows) => rows.map(([label]) => label)))]
    expect(labels).toHaveLength(4)
    const read = (lang: string) =>
      JSON.parse(readFileSync(join(process.cwd(), `public/locales/${lang}/shellUi.json`), "utf8")) as {
        nav: { items: Record<string, string> }
      }
    const en = read("en").nav.items
    for (const label of labels) {
      const key = navLabelKey("items", label).replace("nav.items.", "")
      expect({ key, en: en[key] }).toEqual({ key, en: label })
      for (const lang of ["es", "fr", "pt", "it", "pl", "cs"]) {
        const value = read(lang).nav.items[key]
        expect({ lang, key, present: typeof value === "string" && value.length > 0 }).toEqual({ lang, key, present: true })
        expect({ lang, key, sameAsEnglish: value === label }).toEqual({ lang, key, sameAsEnglish: false })
      }
    }
  })
})

describe("TS-2 — Talent Studio in the order the work runs", () => {
  const KC = "/vertical/knowledge-continuity/dashboard"
  /** [label, destination] per role, in order. This IS the menu with the switch on. */
  const ORDER: Record<string, [string, string][]> = {
    manager: [
      ["Overview", "/manager/talent-studio"],
      ["Role Blueprints", BLUEPRINT_HOME],
      ["Role Blueprint Match", "/manager/job-blueprint"],
      ["Candidates", "/vertical/job-blueprint/candidates"],
      ["Hiring interview", "/manager/interview-live"],
      ["Own-questions interview", "/manager/interview-studio"],
      ["Prepare questions", "/manager/interview-prep"],
      ["Past interviews", "/manager/interviews"],
      ["Insights", "/vertical/job-blueprint/analytics"],
      ["Retain: Knowledge Continuity", KC],
    ],
    practitioner: [
      ["Overview", "/practitioner/talent-studio"],
      ["Role Blueprints", BLUEPRINT_HOME],
      ["Role Blueprint Match", "/practitioner/job-blueprint"],
      ["Candidates", "/vertical/job-blueprint/candidates"],
      ["Hiring interview", "/practitioner/interview-live"],
      ["Own-questions interview", "/practitioner/interview-studio"],
      ["Prepare questions", "/practitioner/interview-prep"],
      ["Insights", "/vertical/job-blueprint/analytics"],
      ["Retain: Knowledge Continuity", KC],
    ],
    "super-admin": [
      ["Overview", "/super-admin/talent-studio"],
      ["Role Blueprints", BLUEPRINT_HOME],
      ["Candidates", "/vertical/job-blueprint/candidates"],
      ["Hiring interview", "/super-admin/interview-live"],
      ["Own-questions interview", "/super-admin/interview-studio"],
      ["Insights", "/vertical/job-blueprint/analytics"],
      ["Retain: Knowledge Continuity", KC],
    ],
  }
  const talentChildren = async (role: UserRole, mode: Mode = "true") =>
    (await tools(role, mode))?.items.find((i) => i.label === TALENT_STUDIO_LABEL)?.children ?? []

  it("the stage order is the lifecycle, with Retain last", () => {
    // TS-4a ("Team fit", not built) goes between insights and retain.
    expect([...TALENT_STUDIO_STAGE_ORDER]).toEqual(["overview", "roles", "candidates", "interviews", "insights", "retain"])
  })

  it.each(TOOL_ROLES)("%s: the rows are exactly the lifecycle order, whatever the entitlements", async (role) => {
    for (const list of Object.values(ENTITLEMENTS)) {
      mockEntitled = list
      const children = await talentChildren(role)
      expect(children.map((c) => [c.label, c.to])).toEqual(ORDER[role])
    }
  })

  it.each(TOOL_ROLES)("%s: there is no Team fit row (TS-4a is not built)", async (role) => {
    const labels = (await talentChildren(role)).map((c) => c.label.toLowerCase())
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.filter((l) => l.includes("team fit"))).toEqual([])
  })

  it.each(TOOL_ROLES)("%s: Candidates and Insights carry the Role Blueprints lock and reason", async (role) => {
    for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
      mockEntitled = list
      const children = await talentChildren(role)
      const home = children.find((c) => c.to === BLUEPRINT_HOME)
      expect(home).toBeDefined()
      for (const to of TS2_BLUEPRINT_PAGES) {
        const row = children.find((c) => c.to === to)
        expect({ ent, to, disabled: !!row?.disabled, reason: row?.disabledReason }).toEqual({
          ent,
          to,
          disabled: !!home?.disabled,
          reason: home?.disabledReason,
        })
      }
      // The control: with every vertical entitled the rows are live, with none they are not.
      if (ent === "all") expect(home?.disabled).toBeFalsy()
      if (ent === "none") expect(home?.disabled).toBe(true)
    }
  })

  it.each(TOOL_ROLES)("%s: every row the role can open is a route that exists", async (role) => {
    const routesSource = readFileSync(join(process.cwd(), "src/routes.tsx"), "utf8")
    let checked = 0
    for (const [, to] of ORDER[role]) {
      if (to.startsWith("/vertical/job-blueprint/")) {
        const child = to.replace("/vertical/job-blueprint/", "")
        expect({ to, routed: routesSource.includes(`{ path: "${child}", element`) }).toEqual({ to, routed: true })
      } else if (to.startsWith("/vertical/")) {
        expect(to).toBe(KC)
      } else {
        // Role-prefixed: ProtectedRoute must let this role in, and the path must be routed.
        expect({ to, opens: hasAccess(role, to) }).toEqual({ to, opens: true })
        expect(to.startsWith(`/${role}/`)).toBe(true)
        expect({ to, routed: routesSource.includes(`path: "${to}"`) }).toEqual({ to, routed: true })
      }
      checked++
    }
    expect(checked).toBe(ORDER[role].length)
  })

  it.each(ROLES)("%s: with the switch off there is no Talent Studio group and no Overview row", async (role) => {
    for (const mode of OFF_MODES) {
      const section = await tools(role, mode)
      const everyRow = (section?.items ?? []).flatMap((i) => [i, ...(i.children ?? [])])
      expect(everyRow.filter((i) => i.label === TALENT_STUDIO_LABEL)).toEqual([])
      expect(everyRow.filter((i) => i.to.endsWith("/talent-studio"))).toEqual([])
      expect(everyRow.filter((i) => i.label.startsWith("Retain"))).toEqual([])
    }
  })

  it("each new label has a menu translation in en, es, fr, pt, it, pl and cs", () => {
    const labels = ["Overview", "Insights", "Retain: Knowledge Continuity"]
    const read = (lang: string) =>
      JSON.parse(readFileSync(join(process.cwd(), `public/locales/${lang}/shellUi.json`), "utf8")) as {
        nav: { items: Record<string, string> }
      }
    const en = read("en").nav.items
    for (const label of labels) {
      const key = navLabelKey("items", label).replace("nav.items.", "")
      expect({ key, en: en[key] }).toEqual({ key, en: label })
      for (const lang of ["es", "fr", "pt", "it", "pl", "cs"]) {
        const value = read(lang).nav.items[key]
        expect({ lang, key, present: typeof value === "string" && value.length > 0 }).toEqual({ lang, key, present: true })
        expect({ lang, key, sameAsEnglish: value === label }).toEqual({ lang, key, sameAsEnglish: false })
      }
    }
    // The product name inside the Retain label stays as it is in every language.
    for (const lang of ["es", "fr", "pt", "it", "pl", "cs"]) {
      expect(read(lang).nav.items.Retain_Knowledge_Continuity).toContain("Knowledge Continuity")
    }
  })
})
