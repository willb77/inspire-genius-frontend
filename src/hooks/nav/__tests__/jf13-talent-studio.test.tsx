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
 *
 * TS-4a (2026-11-24) adds ONE row, "Team fit", between Insights and Retain,
 * for manager and practitioner only, and only when BOTH `job_fit_v2` is on and
 * the build's Team fit flags are on (`TEAM_FIT_BUILD_ENABLED`, mocked on here
 * so the walker covers the row; the TS-4a block turns it off to prove the
 * other half). The destination is named in TS4A_ADDED and nothing else may
 * appear. The off snapshot is untouched.
 *
 * TS-5 (2026-11-24) adds ONE row, "Job DNA", for the manager only, straight
 * after Role Blueprints. It is an existing manager page that no menu linked
 * to. The row is present only beside the Role Blueprints row and copies its
 * lock, so it is checked against that row's state (TS5_ADDED). Practitioner
 * and super-admin gain nothing. The off snapshot is untouched.
 *
 * RM-7 (2026-11-26, Bill's RM-D5: "Talent Studio becomes 7 stage pages with
 * tabs") makes the group ONE ROW PER STAGE, with the switch ON only. The rows
 * the blocks below pinned are now the TABS of their stage, on the stage's
 * pages. So the walker is EXTENDED, never loosened: a tab of a stage whose row
 * the sidebar shows counts as reached (live or greyed as the tab), and the
 * on/off diff must still hold exactly. A floor on the routes reached ONLY
 * through a tab keeps that arm from being vacuous. The TS-2/3/4a/5 blocks read
 * the tabs through `talentTabs`, which first asserts that the menu row of every
 * stage is `talentStudioStageRow` of that stage. The off snapshot is untouched.
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
// TS-4a: the build half of the Team fit gate. A getter, so a test can turn it off.
let mockTeamFitBuild = true
jest.mock("@/constants/teamFit", () => ({
  get TEAM_FIT_BUILD_ENABLED() {
    return mockTeamFitBuild
  },
  TEAM_FIT_PAGE_SIZE: 25,
}))

import {
  useToolsSection,
  useTalentStudioStages,
  talentStudioStageRow,
  TALENT_STUDIO_LABEL,
  TALENT_STUDIO_STAGE_ORDER,
  type TalentStudioStage,
} from "../useToolsSection"
import { hasAccess } from "@/types/roles"
import { navLabelKey } from "@/components/shared/layout/navLabels"
import { setHouseStyle } from "@/lib/house/areaSwitch"
import { useGatedNavItems } from "../useGatedNavItems"
import { FORCE_DISABLED_VERTICALS, useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
import {
  WORKSPACE_ITEM_UNAVAILABLE_REASON,
  getUserNavItems,
  SUPER_ADMIN_NAV_SECTIONS,
  TALENT_STUDIO_INTERVIEW_ROWS,
  TALENT_STUDIO_INTERVIEW_TOOLS,
  TALENT_STUDIO_JOB_DNA_ROWS,
  TALENT_STUDIO_STAGE_ROWS,
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

/** The Tools section and the role's Talent Studio stages, read in one render. */
const toolsAndStages = (role: UserRole, mode: Mode) =>
  renderWith(mode, () => ({ section: useToolsSection(role), stages: useTalentStudioStages(role) }))

/**
 * RM-7: what the stage pages add to {@link reach}. For every Talent Studio
 * group the sidebar shows, each stage row the group holds opens a page whose
 * tabs are the stage's rows, so every tab of that stage is reached, live or
 * greyed as the tab itself. A stage whose row is missing adds nothing.
 */
function reachTabs(items: NavItemDef[], stages: TalentStudioStage[], into: Map<string, boolean>): Map<string, boolean> {
  for (const group of items.filter((i) => i.label === TALENT_STUDIO_LABEL && i.to === "")) {
    for (const stage of stages) {
      const label = TALENT_STUDIO_STAGE_ROWS[stage.key].label
      if (!(group.children ?? []).some((c) => c.label === label)) continue
      for (const tab of stage.rows) into.set(tab.to, (into.get(tab.to) ?? false) || !tab.disabled)
    }
  }
  return into
}

/**
 * RM-7: the Talent Studio group expanded into the pages it opens, in order: the
 * tabs of every stage. First asserts the menu IS the stages: one row per stage,
 * each `talentStudioStageRow` of it. `[]` when the role has no group.
 */
async function talentTabs(role: UserRole, mode: Mode = "true"): Promise<NavItemDef[]> {
  const { section, stages } = await toolsAndStages(role, mode)
  const group = section?.items.find((i) => i.label === TALENT_STUDIO_LABEL)
  if (!group) return []
  expect(group.children).toEqual(stages.map(talentStudioStageRow))
  return stages.flatMap((s) => s.rows)
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

/**
 * TS-4a: the one destination the menu gains with the switch on AND the build
 * flags on. Manager and practitioner only, each under its own prefix;
 * super-admin gains nothing.
 */
const TS4A_ADDED: Partial<Record<UserRole, string>> = {
  manager: "/manager/team-fit",
  practitioner: "/practitioner/team-fit",
}

/**
 * TS-5: the one destination the manager's menu gains with the switch on. Like
 * the TS-2 vertical pages it is live exactly when the Role Blueprints row is.
 * No other role has an entry, so for them the strict diff below must hold.
 */
const TS5_ADDED: Partial<Record<UserRole, string>> = {
  manager: "/manager/job-dna",
}

beforeEach(() => {
  localStorage.clear()
  mockEntitled = ALL_VERTICALS
  mockBroadcastAuthorized = false
  mockTeamFitBuild = true
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
  // RM-7: routes reached with the switch on ONLY through a stage page's tabs.
  let tabOnlyPairs = 0
  const TAB_ONLY_FLOOR = 84

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
              const { section, stages } = await toolsAndStages(role, mode)
              const sidebar = [...rest, ...(section?.items ?? [])]
              const inMenu = reach(sidebar)
              // RM-7: plus every tab of every stage whose row the menu shows.
              const after = reachTabs(sidebar, stages, reach(sidebar))
              tabOnlyPairs += [...after.keys()].filter((to) => !inMenu.has(to)).length
              // TS-3: with the switch on, exactly the named additions, each
              // live and none of them reached before; then the strict diff.
              const overview = TS2_OVERVIEW[role]
              const teamFit = TS4A_ADDED[role]
              const added =
                mode === "true"
                  ? [...(TS3_ADDED[role] ?? []), ...(overview ? [overview] : []), ...(teamFit ? [teamFit] : [])]
                  : []
              // TS-2: the two vertical pages, present only beside the Role
              // Blueprints row and in the same state as it. Since RM-3 the
              // row itself exists only for an account entitled to
              // job-blueprint (hidden, not greyed).
              if (mode === "true" && overview) {
                const blueprintEntitled = (list ?? []).includes("job-blueprint")
                expect({ role, ent, home: after.has(BLUEPRINT_HOME) }).toEqual({ role, ent, home: blueprintEntitled })
                const jobDna = TS5_ADDED[role]
                for (const route of [...TS2_BLUEPRINT_PAGES, ...(jobDna ? [jobDna] : [])]) {
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
    // Floors lowered with RM-3 (2026-11-25): unentitled verticals no longer
    // produce greyed rows, so the "none" and "loading" shapes walk fewer
    // destinations. Measured on the RM-3 branch: 1398 pairs, 294 Tools pairs.
    // Lowered again with RM-4 (2026-11-25): Role Play, Résumé Writer, Settings
    // and Help left the role lists this walker reads as the rest of the sidebar
    // (they are in My Workspace and the footer), and Goals Studio left manager's
    // and practitioner's Tools. Measured on the RM-4 branch: 1218 pairs.
    expect(pairs).toBeGreaterThanOrEqual(1150)
    expect(toolPairs).toBeGreaterThanOrEqual(250)
    // RM-7 (2026-11-26): the tab arm of the walker is not vacuous. Measured on
    // the RM-7 branch: 84. Lowering it needs the same kind of
    // dated reason as the two floors above.
    expect(tabOnlyPairs).toBeGreaterThanOrEqual(TAB_ONLY_FLOOR)
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
    // RM-7: one row per stage, at most seven, in the stage order, Retain last.
    const labels = children.map((c) => c.label)
    const stageLabels = TALENT_STUDIO_STAGE_ORDER.map((k) => TALENT_STUDIO_STAGE_ROWS[k].label as string)
    expect(labels.length).toBeLessThanOrEqual(7)
    expect(labels).toEqual(stageLabels.filter((l) => labels.includes(l)))
    expect(labels.indexOf("Roles")).toBeGreaterThanOrEqual(0)
    expect(labels.indexOf("Roles")).toBeLessThan(labels.indexOf("Interviews"))
    expect(labels[labels.length - 1]).toBe("Retain")
    // Blueprint first, interview next, Knowledge Continuity last — now as tabs.
    const tabs = (await talentTabs(role)).map((c) => c.label)
    expect(tabs.indexOf("Role Blueprints")).toBeGreaterThanOrEqual(0)
    expect(tabs.indexOf("Role Blueprints")).toBeLessThan(tabs.indexOf("Hiring interview"))
    expect(tabs.indexOf("Hiring interview")).toBeLessThan(tabs.indexOf("Own-questions interview"))
    expect(tabs[tabs.length - 1]).toBe("Retain: Knowledge Continuity")
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

  // RM-3 guard (2026-11-25). Mutation: make blueprintPageRow, or the launcher,
  // keep an unentitled vertical's rows greyed — this must fail.
  it("unentitled verticals are left OUT of Talent Studio, not greyed", async () => {
    mockEntitled = []
    const group = (await tools("manager", "true"))?.items.find((i) => i.label === TALENT_STUDIO_LABEL)
    const byLabel = Object.fromEntries((group?.children ?? []).map((c) => [c.label, !!c.disabled]))
    // RM-7: the stage rows — Candidates, Insights and Retain have no tab left.
    expect(byLabel).toEqual({ Overview: false, Roles: false, Interviews: false, "Team fit": false })
    const tabs = Object.fromEntries((await talentTabs("manager")).map((c) => [c.label, !!c.disabled]))
    expect(tabs).toEqual({
      Overview: false,
      "Role Blueprint Match": false,
      "Hiring interview": false,
      "Own-questions interview": false,
      "Prepare questions": false,
      "Past interviews": false,
      "Team fit": false,
    })
  })

  it("entitled to job-blueprint and knowledge-continuity: their rows are present and live", async () => {
    mockEntitled = ["job-blueprint", "knowledge-continuity"]
    const byLabel = Object.fromEntries((await talentTabs("manager")).map((c) => [c.label, !!c.disabled]))
    for (const label of ["Role Blueprints", "Job DNA", "Candidates", "Insights", "Retain: Knowledge Continuity"]) {
      expect([label, byLabel[label]]).toEqual([label, false])
    }
  })

  it("a force-disabled, entitled job-blueprint keeps its rows greyed 'Temporarily unavailable'", async () => {
    FORCE_DISABLED_VERTICALS.add("job-blueprint")
    try {
      mockEntitled = ["job-blueprint"]
      const rows = (await talentTabs("manager")).filter((c) =>
        ["Role Blueprints", "Job DNA", "Candidates", "Insights"].includes(c.label),
      )
      expect(rows.map((r) => [r.label, r.disabled, r.disabledReason])).toEqual([
        ["Role Blueprints", true, WORKSPACE_ITEM_UNAVAILABLE_REASON],
        ["Job DNA", true, WORKSPACE_ITEM_UNAVAILABLE_REASON],
        ["Candidates", true, WORKSPACE_ITEM_UNAVAILABLE_REASON],
        ["Insights", true, WORKSPACE_ITEM_UNAVAILABLE_REASON],
      ])
      // RM-7: a stage whose every tab is greyed is a greyed row with the same
      // reason; Roles still has a live tab (Role Blueprint Match), so it stays
      // live and lands there.
      const group = (await tools("manager", "true"))?.items.find((i) => i.label === TALENT_STUDIO_LABEL)
      const stageRows = (group?.children ?? []).filter((c) => ["Roles", "Candidates", "Insights"].includes(c.label))
      expect(stageRows.map((r) => [r.label, r.to, !!r.disabled, r.disabledReason])).toEqual([
        ["Roles", "/manager/job-blueprint", false, undefined],
        ["Candidates", "/vertical/job-blueprint/candidates", true, WORKSPACE_ITEM_UNAVAILABLE_REASON],
        ["Insights", "/vertical/job-blueprint/analytics", true, WORKSPACE_ITEM_UNAVAILABLE_REASON],
      ])
    } finally {
      FORCE_DISABLED_VERTICALS.delete("job-blueprint")
    }
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
  // RM-7: the interview rows are the Interviews stage's tabs.
  const talentChildren = (role: UserRole) => talentTabs(role)
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
      ["Job DNA", "/manager/job-dna"],
      ["Role Blueprint Match", "/manager/job-blueprint"],
      ["Candidates", "/vertical/job-blueprint/candidates"],
      ["Hiring interview", "/manager/interview-live"],
      ["Own-questions interview", "/manager/interview-studio"],
      ["Prepare questions", "/manager/interview-prep"],
      ["Past interviews", "/manager/interviews"],
      ["Insights", "/vertical/job-blueprint/analytics"],
      ["Team fit", "/manager/team-fit"],
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
      ["Team fit", "/practitioner/team-fit"],
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
  // RM-7: the rows of the TS-2 order are the stages' tabs.
  const talentChildren = (role: UserRole, mode: Mode = "true") => talentTabs(role, mode)
  /** The vertical a row is taken from, or null for a role page that has no vertical lock. */
  const rowVertical = (to: string): string | null =>
    to.startsWith("/vertical/job-blueprint/") || to.endsWith("/job-dna")
      ? "job-blueprint"
      : to === KC
        ? "knowledge-continuity"
        : null
  /**
   * RM-3 (2026-11-25): ORDER as an account with these entitlements sees it —
   * a row taken from a vertical the account is not entitled to is left out,
   * not greyed. The order of what remains is unchanged.
   */
  const orderFor = (role: UserRole, list: string[] | undefined) =>
    ORDER[role].filter(([, to]) => {
      const v = rowVertical(to)
      return v === null || (list ?? []).includes(v)
    })

  it("the stage order is the lifecycle, with Retain last", () => {
    // TS-4a: Team fit sits between insights and retain.
    expect([...TALENT_STUDIO_STAGE_ORDER]).toEqual([
      "overview",
      "roles",
      "candidates",
      "interviews",
      "insights",
      "teamFit",
      "retain",
    ])
  })

  it.each(TOOL_ROLES)("%s: the rows are the lifecycle order, minus unentitled verticals' rows", async (role) => {
    for (const list of Object.values(ENTITLEMENTS)) {
      mockEntitled = list
      const children = await talentChildren(role)
      expect(children.map((c) => [c.label, c.to])).toEqual(orderFor(role, list))
      // Every row present is live: nothing in the group is greyed for entitlement.
      expect(children.filter((c) => c.disabled)).toEqual([])
    }
    // The control: entitled to everything, it is the full ORDER.
    expect(orderFor(role, ALL_VERTICALS)).toEqual(ORDER[role])
  })

  // ── TS-4a ─────────────────────────────────────────────────────────────────
  const isTeamFit = (c: NavItemDef) => c.label.toLowerCase().includes("team fit") || c.to.endsWith("/team-fit")

  it.each(["manager", "practitioner"] as UserRole[])(
    "%s: one Team fit row, live, under the role's own prefix, between Insights and Retain",
    async (role) => {
      for (const list of Object.values(ENTITLEMENTS)) {
        mockEntitled = list
        const children = await talentChildren(role)
        const rows = children.filter(isTeamFit)
        expect(rows.map((c) => [c.label, c.to, !!c.disabled])).toEqual([["Team fit", `/${role}/team-fit`, false]])
        // Its neighbours in the order this account sees (Insights and Retain
        // when the verticals are entitled; RM-3 leaves them out otherwise).
        const order = orderFor(role, list)
        const want = order.findIndex(([label]) => label === "Team fit")
        const at = children.indexOf(rows[0])
        expect(children[at - 1].label).toBe(order[want - 1][0])
        expect(children[at + 1]?.label).toBe(order[want + 1]?.[0])
        if (list === ALL_VERTICALS) {
          expect(children[at - 1].label).toBe("Insights")
          expect(children[at + 1].label).toBe("Retain: Knowledge Continuity")
        }
        expect(hasAccess(role, rows[0].to)).toBe(true)
      }
    },
  )

  it("super-admin: no Team fit row, with every flag on", async () => {
    const children = await talentChildren("super-admin")
    expect(children.length).toBeGreaterThan(0)
    expect(children.filter(isTeamFit)).toEqual([])
  })

  it.each(TOOL_ROLES)("%s: with the build flags off there is no Team fit row and the rest is unchanged", async (role) => {
    mockTeamFitBuild = false
    const children = await talentChildren(role)
    expect(children.filter(isTeamFit)).toEqual([])
    expect(children.map((c) => [c.label, c.to])).toEqual(ORDER[role].filter(([label]) => label !== "Team fit"))
  })

  it.each(ROLES)("%s: with job_fit_v2 off there is no Team fit row anywhere in the sidebar", async (role) => {
    let rowsSeen = 0
    for (const mode of OFF_MODES) {
      const rest = await restOfSidebar(role, mode)
      const section = await tools(role, mode)
      const everyRow = [...rest, ...(section?.items ?? [])].flatMap((i) => [i, ...(i.children ?? [])])
      rowsSeen += everyRow.length
      expect(everyRow.filter(isTeamFit)).toEqual([])
    }
    expect(rowsSeen).toBeGreaterThan(0)
  })

  it.each(["user", "company-admin", "distributor", "super-admin"] as UserRole[])(
    "%s: no Team fit row anywhere in the sidebar with every flag on",
    async (role) => {
      const rest = await restOfSidebar(role, "true")
      const section = await tools(role, "true")
      const everyRow = [...rest, ...(section?.items ?? [])].flatMap((i) => [i, ...(i.children ?? [])])
      expect(everyRow.length).toBeGreaterThan(0)
      expect(everyRow.filter(isTeamFit)).toEqual([])
    },
  )

  it("the Team fit label has a menu translation in en, es, fr, pt, it, pl and cs", () => {
    const read = (lang: string) =>
      JSON.parse(readFileSync(join(process.cwd(), `public/locales/${lang}/shellUi.json`), "utf8")) as {
        nav: { items: Record<string, string> }
      }
    const key = navLabelKey("items", "Team fit").replace("nav.items.", "")
    expect({ key, en: read("en").nav.items[key] }).toEqual({ key, en: "Team fit" })
    for (const lang of ["es", "fr", "pt", "it", "pl", "cs"]) {
      const value = read(lang).nav.items[key]
      expect({ lang, present: typeof value === "string" && value.length > 0 }).toEqual({ lang, present: true })
      expect({ lang, sameAsEnglish: value === "Team fit" }).toEqual({ lang, sameAsEnglish: false })
    }
  })

  it.each(TOOL_ROLES)("%s: Candidates and Insights follow the Role Blueprints row (present, live, absent)", async (role) => {
    for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
      mockEntitled = list
      const children = await talentChildren(role)
      const home = children.find((c) => c.to === BLUEPRINT_HOME)
      // RM-3: unentitled (or still loading), the row and its pages are absent.
      if (ent !== "all") {
        expect({ ent, home: home ?? null }).toEqual({ ent, home: null })
        for (const to of TS2_BLUEPRINT_PAGES) {
          expect({ ent, to, row: children.find((c) => c.to === to) ?? null }).toEqual({ ent, to, row: null })
        }
        continue
      }
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
      // The control: with every vertical entitled the rows are live (and above,
      // with none they are absent).
      expect(home?.disabled).toBeFalsy()
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

describe("TS-5 — Job DNA in Talent Studio, for the manager only", () => {
  const JOB_DNA = "/manager/job-dna"
  const isJobDna = (c: NavItemDef) => c.label === "Job DNA" || c.to.endsWith("/job-dna")
  // RM-7: Job DNA is a tab of the Roles stage.
  const talentChildren = (role: UserRole) => talentTabs(role)
  /** Every row the role's sidebar paints: the main menu, the Tools section, and one level of children. */
  const everyRow = async (role: UserRole, mode: Mode) =>
    [...(await restOfSidebar(role, mode)), ...((await tools(role, mode))?.items ?? [])].flatMap((i) => [
      i,
      ...(i.children ?? []),
    ])

  it("the row is declared for the manager and for no other role", () => {
    expect(TALENT_STUDIO_JOB_DNA_ROWS.map(([role, row]) => [role, row.label, row.to])).toEqual([
      ["manager", "Job DNA", JOB_DNA],
    ])
  })

  it("manager: one row, straight after Role Blueprints, with that row's lock and reason", async () => {
    for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
      mockEntitled = list
      const children = await talentChildren("manager")
      const rows = children.filter(isJobDna)
      // RM-3: without the Role Blueprints vertical (or while the read loads)
      // neither row is there — hidden, not greyed.
      if (ent !== "all") {
        expect({ ent, jobDna: rows.length, home: children.some((c) => c.to === BLUEPRINT_HOME) }).toEqual({
          ent,
          jobDna: 0,
          home: false,
        })
        continue
      }
      expect(rows.map((c) => [c.label, c.to])).toEqual([["Job DNA", JOB_DNA]])
      const at = children.indexOf(rows[0])
      const home = children[at - 1]
      expect(home.to).toBe(BLUEPRINT_HOME)
      expect({ ent, disabled: !!rows[0].disabled, reason: rows[0].disabledReason }).toEqual({
        ent,
        disabled: !!home.disabled,
        reason: home.disabledReason,
      })
      // Lit on its own page only, not on the vertical's pages.
      expect(rows[0].activePrefix).toBe(JOB_DNA)
      // The control: entitled it is a live link (unentitled it is absent, above).
      expect(rows[0].disabled).toBeFalsy()
    }
  })

  it("manager: the page is routed and the manager may open it", () => {
    const routesSource = readFileSync(join(process.cwd(), "src/routes.tsx"), "utf8")
    expect(routesSource.includes(`path: "${JOB_DNA}"`)).toBe(true)
    expect(hasAccess("manager", JOB_DNA)).toBe(true)
    expect(hasAccess("practitioner", JOB_DNA)).toBe(false)
  })

  it.each(ROLES.filter((r) => r !== "manager"))(
    "%s: no Job DNA row anywhere in the sidebar, with every flag on, whatever the entitlements",
    async (role) => {
      let rowsSeen = 0
      for (const list of Object.values(ENTITLEMENTS)) {
        mockEntitled = list
        const rows = await everyRow(role, "true")
        rowsSeen += rows.length
        expect(rows.filter(isJobDna)).toEqual([])
      }
      expect(rowsSeen).toBeGreaterThan(0)
    },
  )

  it.each(ROLES)("%s: with job_fit_v2 off there is no Job DNA row anywhere in the sidebar", async (role) => {
    let rowsSeen = 0
    for (const mode of OFF_MODES) {
      const rows = await everyRow(role, mode)
      rowsSeen += rows.length
      expect(rows.filter(isJobDna)).toEqual([])
    }
    expect(rowsSeen).toBeGreaterThan(0)
  })

  it("manager: the label and the destination are each used at most once in the whole sidebar", async () => {
    for (const list of Object.values(ENTITLEMENTS)) {
      mockEntitled = list
      const rows = await everyRow("manager", "true")
      // Once when the Role Blueprints vertical is entitled; since RM-3, not at all otherwise.
      const want = (list ?? []).includes("job-blueprint") ? 1 : 0
      // RM-7: in the sidebar it is the Roles row's landing page (Job DNA is the
      // Roles stage's first tab that is not a vertical page); the label is a tab.
      expect(rows.filter((r) => r.label === "Job DNA")).toHaveLength(0)
      expect(rows.filter((r) => r.to === JOB_DNA).map((r) => r.label)).toEqual(want ? ["Roles"] : [])
      expect((await talentChildren("manager")).filter((r) => r.label === "Job DNA")).toHaveLength(want)
      // SidebarScaffold keys a row by `to || label`: no other row may share this one's key.
      const keys = rows.map((r) => r.to || r.label)
      expect(keys.filter((k) => k === JOB_DNA || k === "Job DNA")).toHaveLength(want)
    }
  })

  it("the label is the page's own heading, which every language keeps, so the menu has no key for it", () => {
    const read = (lang: string, ns: string) =>
      JSON.parse(readFileSync(join(process.cwd(), `public/locales/${lang}/${ns}.json`), "utf8")) as Record<
        string,
        Record<string, unknown>
      >
    const key = navLabelKey("items", "Job DNA").replace("nav.items.", "")
    expect(key).toBe("Job_DNA")
    for (const lang of ["en", "es", "fr", "pt", "it", "pl", "cs"]) {
      expect({ lang, heading: read(lang, "managerPages").jobDna.jobDna }).toEqual({ lang, heading: "Job DNA" })
      const items = (read(lang, "shellUi").nav as { items: Record<string, string> }).items
      expect({ lang, hasMenuKey: key in items }).toEqual({ lang, hasMenuKey: false })
    }
  })
})

describe("RM-7 — one row per stage; the stage's rows are its tabs", () => {
  const stageOf = (stages: TalentStudioStage[], row: NavItemDef) =>
    stages.find((s) => TALENT_STUDIO_STAGE_ROWS[s.key].label === row.label)

  // The brief's guard. Mutation: let talentStudioStages keep a stage with no
  // rows (or build a row for one) — a row with no tab must fail here.
  it.each(TOOL_ROLES)("%s: at most 7 rows, one per stage with a tab, none for an empty stage", async (role) => {
    let rowsSeen = 0
    for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
      mockEntitled = list
      const { section, stages } = await toolsAndStages(role, "true")
      const rows = section?.items.find((i) => i.label === TALENT_STUDIO_LABEL)?.children ?? []
      rowsSeen += rows.length
      expect(rows.length).toBeLessThanOrEqual(7)
      for (const row of rows) {
        const stage = stageOf(stages, row)
        expect({ ent, row: row.label, tabs: (stage?.rows.length ?? 0) > 0 }).toEqual({ ent, row: row.label, tabs: true })
      }
      for (const stage of stages) {
        const label = TALENT_STUDIO_STAGE_ROWS[stage.key].label
        expect({ ent, label, row: rows.some((r) => r.label === label) }).toEqual({ ent, label, row: stage.rows.length > 0 })
      }
    }
    expect(rowsSeen).toBeGreaterThan(0)
  })

  it.each(TOOL_ROLES)("%s: a row of several tabs lands on a live tab that is not a vertical page, and is lit on every tab", async (role) => {
    const { section, stages } = await toolsAndStages(role, "true")
    const rows = section?.items.find((i) => i.label === TALENT_STUDIO_LABEL)?.children ?? []
    let multi = 0
    for (const row of rows) {
      const stage = stageOf(stages, row)!
      if (stage.rows.length < 2) {
        expect(row.activePaths).toBeUndefined()
        continue
      }
      multi++
      const landing = stage.rows.find((t) => t.to === row.to)
      expect({ row: row.label, landing: landing?.label, vertical: row.to.startsWith("/vertical/") }).toEqual({
        row: row.label,
        landing: landing?.label,
        vertical: false,
      })
      expect(landing?.disabled).toBeFalsy()
      expect(row.activePaths).toEqual(stage.rows.map((t) => t.activePrefix ?? t.to))
    }
    // Manager and practitioner: Roles and Interviews; super-admin: Interviews.
    expect(multi).toBe(role === "super-admin" ? 1 : 2)
  })

  it("the stage rows as rendered, per role", async () => {
    const views: Record<string, unknown> = {}
    for (const role of TOOL_ROLES) {
      const { section, stages } = await toolsAndStages(role, "true")
      const group = section?.items.find((i) => i.label === TALENT_STUDIO_LABEL)
      views[role] = (group?.children ?? []).map((row) => ({
        row: `${row.label} -> ${row.to}`,
        tabs: stageOf(stages, row)!.rows.map((t) => `${t.label} -> ${t.to}`),
      }))
    }
    expect(views).toEqual({
      manager: [
        { row: "Overview -> /manager/talent-studio", tabs: ["Overview -> /manager/talent-studio"] },
        {
          row: "Roles -> /manager/job-dna",
          tabs: [
            `Role Blueprints -> ${BLUEPRINT_HOME}`,
            "Job DNA -> /manager/job-dna",
            "Role Blueprint Match -> /manager/job-blueprint",
          ],
        },
        { row: "Candidates -> /vertical/job-blueprint/candidates", tabs: ["Candidates -> /vertical/job-blueprint/candidates"] },
        {
          row: "Interviews -> /manager/interview-live",
          tabs: [
            "Hiring interview -> /manager/interview-live",
            "Own-questions interview -> /manager/interview-studio",
            "Prepare questions -> /manager/interview-prep",
            "Past interviews -> /manager/interviews",
          ],
        },
        { row: "Insights -> /vertical/job-blueprint/analytics", tabs: ["Insights -> /vertical/job-blueprint/analytics"] },
        { row: "Team fit -> /manager/team-fit", tabs: ["Team fit -> /manager/team-fit"] },
        {
          row: "Retain -> /vertical/knowledge-continuity/dashboard",
          tabs: ["Retain: Knowledge Continuity -> /vertical/knowledge-continuity/dashboard"],
        },
      ],
      practitioner: [
        { row: "Overview -> /practitioner/talent-studio", tabs: ["Overview -> /practitioner/talent-studio"] },
        {
          row: "Roles -> /practitioner/job-blueprint",
          tabs: [`Role Blueprints -> ${BLUEPRINT_HOME}`, "Role Blueprint Match -> /practitioner/job-blueprint"],
        },
        { row: "Candidates -> /vertical/job-blueprint/candidates", tabs: ["Candidates -> /vertical/job-blueprint/candidates"] },
        {
          row: "Interviews -> /practitioner/interview-live",
          tabs: [
            "Hiring interview -> /practitioner/interview-live",
            "Own-questions interview -> /practitioner/interview-studio",
            "Prepare questions -> /practitioner/interview-prep",
          ],
        },
        { row: "Insights -> /vertical/job-blueprint/analytics", tabs: ["Insights -> /vertical/job-blueprint/analytics"] },
        { row: "Team fit -> /practitioner/team-fit", tabs: ["Team fit -> /practitioner/team-fit"] },
        {
          row: "Retain -> /vertical/knowledge-continuity/dashboard",
          tabs: ["Retain: Knowledge Continuity -> /vertical/knowledge-continuity/dashboard"],
        },
      ],
      "super-admin": [
        { row: "Overview -> /super-admin/talent-studio", tabs: ["Overview -> /super-admin/talent-studio"] },
        { row: `Roles -> ${BLUEPRINT_HOME}`, tabs: [`Role Blueprints -> ${BLUEPRINT_HOME}`] },
        { row: "Candidates -> /vertical/job-blueprint/candidates", tabs: ["Candidates -> /vertical/job-blueprint/candidates"] },
        {
          row: "Interviews -> /super-admin/interview-live",
          tabs: [
            "Hiring interview -> /super-admin/interview-live",
            "Own-questions interview -> /super-admin/interview-studio",
          ],
        },
        { row: "Insights -> /vertical/job-blueprint/analytics", tabs: ["Insights -> /vertical/job-blueprint/analytics"] },
        {
          row: "Retain -> /vertical/knowledge-continuity/dashboard",
          tabs: ["Retain: Knowledge Continuity -> /vertical/knowledge-continuity/dashboard"],
        },
      ],
    })
  })

  it("each stage label has a menu translation in en, es, fr, pt, it, pl and cs", () => {
    const read = (lang: string) =>
      JSON.parse(readFileSync(join(process.cwd(), `public/locales/${lang}/shellUi.json`), "utf8")) as {
        nav: { items: Record<string, string> }
      }
    const en = read("en").nav.items
    for (const { label } of Object.values(TALENT_STUDIO_STAGE_ROWS)) {
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
