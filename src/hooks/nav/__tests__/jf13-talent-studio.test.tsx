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
 */
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

import { useToolsSection, TALENT_STUDIO_LABEL } from "../useToolsSection"
import { useGatedNavItems } from "../useGatedNavItems"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
import { getUserNavItems, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation"

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
  const TOP_LEVEL_GONE = ["Career Studio", "Interview Studio", "Job Blueprint", "Knowledge Continuity Studio"]

  it.each(TOOL_ROLES)("%s: one Talent Studio group, nothing nested below one level", async (role) => {
    const section = await tools(role, "true")
    const items = section?.items ?? []
    const groups = items.filter((i) => i.label === TALENT_STUDIO_LABEL)
    expect(groups).toHaveLength(1)
    expect(groups[0].to).toBe("")
    for (const label of TOP_LEVEL_GONE) expect(items.map((i) => i.label)).not.toContain(label)
    const children = groups[0].children ?? []
    // Two sections then Knowledge Continuity: blueprint first, interview next.
    const labels = children.map((c) => c.label)
    expect(labels.indexOf("Career Blueprint")).toBeLessThan(labels.indexOf("Interview Studio"))
    expect(labels.indexOf("Interview Studio")).toBeLessThan(labels.indexOf("Live Interview"))
    expect(labels[labels.length - 1]).toBe("Knowledge Continuity Studio")
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
      "Job Blueprint": false,
      "Career Blueprint": true,
      "Interview Studio": false,
      "Live Interview": false,
      "Knowledge Continuity Studio": true,
    })
  })

  it("the three role views, as rendered", async () => {
    const views: Record<string, unknown> = {}
    for (const role of TOOL_ROLES) views[role] = dumpSection(await tools(role, "true"))
    expect(views).toMatchSnapshot()
  })
})
