/**
 * @jest-environment jsdom
 *
 * JF-13 admin — the Administration section in categories, behind `job_fit_v2`.
 *
 * With the switch on, the super-admin's Administration section is shown in the
 * categories the house-style admin menu already uses (People, Support, PRISM,
 * AI coaches, Reports, Advanced), with Dashboard left at the top. Only grouping
 * moves: every entry keeps its route, label and owner-only gate.
 *
 * The three readers of `SUPER_ADMIN_NAV_SECTIONS` are exercised for real —
 * SuperAdminLayout, UserLayout and useVerticalPageSections — through the real
 * `job_fit_v2` signal (`useSavedJobsEnabled`, with only the HTTP call stubbed),
 * the real navigation constants and the real vertical registry. Only
 * SidebarScaffold is replaced, by a stub that records the sections it is given.
 *
 *   1. Off — status loading, unreadable, or `false` — every sidebar is today's.
 *      The snapshots in this file were recorded against the code BEFORE this
 *      change, so a passing run is the base-vs-branch identity.
 *   2. The role × route reachability diff: for every role, reader, entitlement
 *      shape, owner or not, and main-menu switch state, the set of destinations
 *      the sidebar reaches (and whether each is live or greyed) is the same with
 *      the Administration switch on as off. The walker models SidebarScaffold,
 *      which renders ONE level of children: anything deeper is unreachable.
 *   3. On — the shape of the categorised section.
 */
import { act, render } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import "@/verticals"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import type { VerticalKey } from "@/verticals/core"

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

const ALL_VERTICALS: VerticalKey[] = [
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
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}))
jest.mock("@/lib/agentApi", () => ({ useAgentEngine: () => true }))
let mockUser: { role: UserRole; email: string | null } = { role: "super-admin", email: null }
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }))
jest.mock("@/components/grant/GrantPreviewToggle", () => ({ __esModule: true, default: () => null }))

let mockCaptured: NavSectionDef[] | undefined
let mockCapturedItems: NavItemDef[] = []
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: { navItems: NavItemDef[]; navSections?: NavSectionDef[] }) => {
    mockCaptured = props.navSections
    mockCapturedItems = props.navItems
    return null
  },
}))

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import UserLayout from "@/layouts/UserLayout"
import { useVerticalPageSections } from "../useVerticalPageSections"
import { PLATFORM_OWNER_EMAIL, SUPER_ADMIN_NAV_ITEMS, OWNER_ONLY_NAV_ROUTES } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { HOUSE_SUPER_ADMIN_SECTIONS } from "@/constants/house/superAdminNav"
import { groupAdministrationItems } from "@/constants/house/administrationCategories"

const ROLES: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]
const ENTITLEMENTS: Record<string, string[] | undefined> = {
  all: ALL_VERTICALS,
  none: [],
  loading: undefined,
}
const OFF_MODES: Mode[] = ["loading", "error", "false"]
const STATUS_KEY = ["saved-jobs", "enabled"]
const ADMIN = "Administration"

async function clientFor(mode: Mode): Promise<QueryClient> {
  mockMode = mode
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (mode !== "loading") {
    const { getSavedJobsEnabled } = jest.requireMock("@/services/job-fit/savedJobs.service")
    await client.prefetchQuery({ queryKey: STATUS_KEY, queryFn: getSavedJobsEnabled })
  }
  return client
}

type Reader = { kind: "super-admin-layout" } | { kind: "user-layout" } | { kind: "vertical"; vertical: VerticalKey }

function VerticalProbe({ vertical, role }: { vertical: VerticalKey; role: UserRole }) {
  mockCaptured = useVerticalPageSections(vertical, role)
  mockCapturedItems = []
  return null
}

/** The sections a reader hands SidebarScaffold, for one role and one switch state. */
async function sidebar(reader: Reader, role: UserRole, mode: Mode): Promise<NavSectionDef[]> {
  const client = await clientFor(mode)
  mockCaptured = undefined
  mockCapturedItems = []
  mockUser = { ...mockUser, role }
  const tree: ReactNode =
    reader.kind === "super-admin-layout" ? (
      <SuperAdminLayout>page</SuperAdminLayout>
    ) : reader.kind === "user-layout" ? (
      <UserLayout>page</UserLayout>
    ) : (
      <VerticalProbe vertical={reader.vertical} role={role} />
    )
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{tree}</MemoryRouter>
    </QueryClientProvider>,
  )
  await act(async () => {})
  // A layout with no sections renders the flat `navItems` list instead.
  const sections = mockCaptured ?? [{ label: "", items: mockCapturedItems }]
  unmount()
  return sections
}

/** Text form: one line per row, children indented one step. */
function dump(items: NavItemDef[], depth = 0): string[] {
  return items.flatMap((i) => [
    `${"  ".repeat(depth)}${i.label} -> ${i.to || "(group)"}${i.disabled ? " (greyed)" : ""}`,
    ...dump(i.children ?? [], depth + 1),
  ])
}
const dumpSections = (sections: NavSectionDef[]) =>
  sections.map((s) => ({
    label: s.label,
    ...(s.defaultCollapsed !== undefined ? { defaultCollapsed: s.defaultCollapsed } : {}),
    ...(s.collapsible !== undefined ? { collapsible: s.collapsible } : {}),
    items: dump(s.items),
  }))

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
const adminOf = (sections: NavSectionDef[]) => sections.filter((s) => s.label === ADMIN).flatMap((s) => s.items)
const restOf = (sections: NavSectionDef[]) => sections.filter((s) => s.label !== ADMIN).flatMap((s) => s.items)

beforeEach(() => {
  localStorage.clear()
  mockEntitled = ALL_VERTICALS
  mockUser = { role: "super-admin", email: null }
})

const OWNERS: Record<string, string | null> = { owner: PLATFORM_OWNER_EMAIL, other: null }

describe("JF-13 admin — job_fit_v2 off: every sidebar that reads Administration is today's", () => {
  it.each(Object.keys(OWNERS))("SuperAdminLayout (%s): loading, unreadable and false are one menu, and it is today's", async (who) => {
    mockUser = { role: "super-admin", email: OWNERS[who] }
    const golden: Record<string, unknown> = {}
    for (const house of [false, true]) {
      if (house) localStorage.setItem("house_style_admin", "true")
      else localStorage.removeItem("house_style_admin")
      for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
        mockEntitled = list
        const views = []
        for (const mode of OFF_MODES) views.push(dumpSections(await sidebar({ kind: "super-admin-layout" }, "super-admin", mode)))
        expect(views[1]).toEqual(views[0])
        expect(views[2]).toEqual(views[0])
        golden[`house=${house}/${ent}`] = views[0]
      }
    }
    expect(golden).toMatchSnapshot()
  })

  it.each(ROLES)("UserLayout (%s): loading, unreadable and false are one menu, and it is today's", async (role) => {
    const golden: Record<string, unknown> = {}
    for (const who of Object.keys(OWNERS)) {
      mockUser = { role, email: OWNERS[who] }
      const views = []
      for (const mode of OFF_MODES) views.push(dumpSections(await sidebar({ kind: "user-layout" }, role, mode)))
      expect(views[1]).toEqual(views[0])
      expect(views[2]).toEqual(views[0])
      golden[who] = views[0]
    }
    expect(golden).toMatchSnapshot()
  })

  it.each(Object.keys(OWNERS))("vertical pages, super-admin (%s): the Administration section is today's", async (who) => {
    mockUser = { role: "super-admin", email: OWNERS[who] }
    const golden: Record<string, unknown> = {}
    for (const vertical of ALL_VERTICALS) {
      const views = []
      for (const mode of OFF_MODES) {
        const sections = await sidebar({ kind: "vertical", vertical }, "super-admin", mode)
        views.push({
          order: sections.map((s) => s.label),
          administration: dumpSections(sections.filter((s) => s.label === ADMIN)),
        })
      }
      expect(views[1]).toEqual(views[0])
      expect(views[2]).toEqual(views[0])
      golden[vertical] = views[0]
    }
    expect(golden).toMatchSnapshot()
  })
})

describe("JF-13 admin — role × route reachability, before (off) and after (on)", () => {
  let pairs = 0
  let adminPairs = 0
  const readers: [string, Reader, UserRole[]][] = [
    ["SuperAdminLayout", { kind: "super-admin-layout" }, ["super-admin"]],
    ["UserLayout", { kind: "user-layout" }, ROLES],
    ...ALL_VERTICALS.map((v): [string, Reader, UserRole[]] => [`vertical ${v}`, { kind: "vertical", vertical: v }, ROLES]),
  ]

  it.each(readers)(
    "%s: every destination reached today is still reached, live or greyed as today",
    async (_name, reader, roles) => {
      for (const role of roles) {
        for (const who of Object.keys(OWNERS)) {
          mockUser = { role, email: OWNERS[who] }
          for (const house of reader.kind === "super-admin-layout" ? [false, true] : [false]) {
            if (house) localStorage.setItem("house_style_admin", "true")
            else localStorage.removeItem("house_style_admin")
            for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
              mockEntitled = list
              const views: Partial<Record<Mode, NavSectionDef[]>> = {}
              for (const mode of ["false", "loading", "error", "true"] as Mode[]) {
                views[mode] = await sidebar(reader, role, mode)
              }
              const today = adminOf(views.false ?? [])
              // The rest of the sidebar under both main-menu switch states; the
              // Administration half is swapped between today's and each after-state.
              for (const restMode of ["false", "true"] as Mode[]) {
                const rest = restOf(views[restMode] ?? [])
                const before = reach([...rest, ...today])
                for (const mode of ["loading", "error", "true"] as Mode[]) {
                  const after = reach([...rest, ...adminOf(views[mode] ?? [])])
                  expect({ role, who, house, ent, restMode, mode, routes: sorted(after) }).toEqual({
                    role,
                    who,
                    house,
                    ent,
                    restMode,
                    mode,
                    routes: sorted(before),
                  })
                }
                pairs += before.size
                adminPairs += reach(today).size
              }
            }
          }
        }
      }
    },
    120_000,
  )

  it("walked every reader and role (a walker over nothing proves nothing)", () => {
    // 1 + 6 + 8×6 (reader, role) pairs × owner or not × 3 entitlement shapes ×
    // 2 main-menu states (SuperAdminLayout also × house style on/off): 18,004
    // (role, route) pairs per pass, 3,786 of them from Administration, each
    // checked against 3 after-states. Floors sit just under the measured run.
    expect(pairs).toBeGreaterThanOrEqual(18_000)
    expect(adminPairs).toBeGreaterThanOrEqual(3_700)
  })
})

describe("JF-13 admin — job_fit_v2 on: Administration in categories", () => {
  const CATEGORIES = ["People", "Support", "PRISM", "AI coaches", "Reports", "Advanced"]

  async function adminOn(reader: Reader, email: string | null): Promise<NavItemDef[]> {
    mockUser = { role: "super-admin", email }
    return adminOf(await sidebar(reader, "super-admin", "true"))
  }

  it.each([
    ["SuperAdminLayout", { kind: "super-admin-layout" } as Reader],
    ["UserLayout", { kind: "user-layout" } as Reader],
    ["vertical grant", { kind: "vertical", vertical: "grant" } as Reader],
  ])("%s: Dashboard, then the six categories, nothing nested below one level", async (_n, reader) => {
    const items = await adminOn(reader, PLATFORM_OWNER_EMAIL)
    expect(items.map((i) => i.label)).toEqual(["Dashboard", ...CATEGORIES])
    for (const group of items.slice(1)) {
      expect(group.to).toBe("")
      expect(group.children?.length).toBeGreaterThan(0)
      // SidebarScaffold renders one level of children; anything deeper is unreachable.
      expect(group.children?.every((c) => !c.children?.length)).toBe(true)
    }
    // Keys are `to || label`: unique across the section, children included.
    const keys = [...items, ...items.flatMap((i) => i.children ?? [])].map((i) => i.to || i.label)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("every classic entry keeps its route and label, and is reachable once", async () => {
    const items = await adminOn({ kind: "super-admin-layout" }, PLATFORM_OWNER_EMAIL)
    const flat = [...items.filter((i) => i.to), ...items.flatMap((i) => i.children ?? [])]
    const classic = SUPER_ADMIN_NAV_ITEMS.flatMap((i) => [i, ...(i.children ?? [])])
    expect(flat.map((i) => `${i.label} -> ${i.to}`).sort()).toEqual(classic.map((i) => `${i.label} -> ${i.to}`).sort())
  })

  it("the owner-only entry is still removed for every other super-admin", async () => {
    for (const reader of [{ kind: "super-admin-layout" }, { kind: "vertical", vertical: "lumen" }] as Reader[]) {
      const items = await adminOn(reader, null)
      const routes = [...items, ...items.flatMap((i) => i.children ?? [])].map((i) => i.to)
      for (const r of OWNER_ONLY_NAV_ROUTES) expect(routes).not.toContain(r)
      // No category left empty by the filter, and none dropped.
      expect(items.slice(1).every((g) => (g.children?.length ?? 0) > 0)).toBe(true)
    }
  })

  it("Intake's saved views sit beside Intake in People, not a level below it", async () => {
    const items = await adminOn({ kind: "super-admin-layout" }, PLATFORM_OWNER_EMAIL)
    const people = items.find((i) => i.label === "People")
    const children = people?.children ?? []
    const at = children.findIndex((c) => c.to === ROUTES.SUPER_ADMIN.INTAKE)
    expect(at).toBeGreaterThanOrEqual(0)
    expect(children[at + 1]?.to.startsWith(`${ROUTES.SUPER_ADMIN.INTAKE}?`)).toBe(true)
  })

  it("house style keeps its own menu: the switch does not touch it", async () => {
    localStorage.setItem("house_style_admin", "true")
    mockUser = { role: "super-admin", email: PLATFORM_OWNER_EMAIL }
    const off = dumpSections(await sidebar({ kind: "super-admin-layout" }, "super-admin", "false"))
    const on = dumpSections(await sidebar({ kind: "super-admin-layout" }, "super-admin", "true"))
    // Only the house sections: My Workspace (JF-8) and Tools (JF-13 Talent
    // Studio) change under the same switch and are pinned in their own suites.
    const house = new Set(HOUSE_SUPER_ADMIN_SECTIONS.map((s) => s.label))
    const houseOnly = (s: ReturnType<typeof dumpSections>) => s.filter((x) => house.has(x.label))
    expect(houseOnly(off).length).toBe(HOUSE_SUPER_ADMIN_SECTIONS.length)
    expect(houseOnly(on)).toEqual(houseOnly(off))
  })

  it.each(ROLES.filter((r) => r !== "super-admin"))("%s: still has no Administration section", async (role) => {
    mockUser = { role, email: null }
    expect(adminOf(await sidebar({ kind: "user-layout" }, role, "true"))).toEqual([])
    expect(adminOf(await sidebar({ kind: "vertical", vertical: "grant" }, role, "true"))).toEqual([])
  })

  it("the categorised section, as rendered", async () => {
    const views: Record<string, unknown> = {}
    for (const who of Object.keys(OWNERS)) {
      views[who] = dump(await adminOn({ kind: "super-admin-layout" }, OWNERS[who]))
    }
    expect(views).toMatchSnapshot()
  })
})

describe("JF-13 admin — groupAdministrationItems keeps each entry as it is", () => {
  it("a greyed entry stays greyed with its lock reason; an entry no category claims stays on top", () => {
    const greyed: NavItemDef = {
      to: ROUTES.SUPER_ADMIN.RESEARCH,
      icon: SUPER_ADMIN_NAV_ITEMS[0].icon,
      label: "Research",
      disabled: true,
      disabledReason: "Locked for this test",
    }
    const unclaimed: NavItemDef = { to: "/not-a-house-route", icon: greyed.icon, label: "Elsewhere" }
    const out = groupAdministrationItems([unclaimed, greyed])
    expect(out[0]).toBe(unclaimed)
    const group = out.find((i) => i.children?.some((c) => c.to === greyed.to))
    expect(group?.label).toBe("AI coaches")
    expect(group?.children?.[0]).toEqual(
      expect.objectContaining({ disabled: true, disabledReason: "Locked for this test", label: "Research" }),
    )
    // No category is shown with nothing in it.
    expect(out).toHaveLength(2)
  })
})
