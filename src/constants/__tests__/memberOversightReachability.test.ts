/**
 * U6c, decision D13 — Member Oversight leaves the manager's main menu and is
 * opened from the Team Development Studio as "Engagement". Its page and route
 * (/manager/students) are unchanged.
 *
 * Role x route: for every role and both values of the pilot build flag
 * (VITE_FEATURE_TEAM_DEVELOPMENT; every deployed build sets it, jest and
 * .env.example leave it unset), this works out whether the role's menu leads
 * to the page — directly, or through a Studio row whose manager mount carries
 * the Engagement link — and whether ProtectedRoute would let the role in.
 * The Studio half is pinned in DevelopmentStudio.sharing.test.tsx (the manager
 * mount renders the link; the practitioner mount does not).
 */
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"

type Nav = typeof import("@/constants/navigation")

function loadNav(flag: "true" | undefined): { nav: Nav; ROUTES: typeof import("@/constants/routes").ROUTES } {
  const before = process.env.VITE_FEATURE_TEAM_DEVELOPMENT
  if (flag === undefined) delete process.env.VITE_FEATURE_TEAM_DEVELOPMENT
  else process.env.VITE_FEATURE_TEAM_DEVELOPMENT = flag
  let out!: { nav: Nav; ROUTES: typeof import("@/constants/routes").ROUTES }
  jest.isolateModules(() => {
    out = {
      nav: jest.requireActual("@/constants/navigation"),
      ROUTES: jest.requireActual("@/constants/routes").ROUTES,
    }
  })
  if (before === undefined) delete process.env.VITE_FEATURE_TEAM_DEVELOPMENT
  else process.env.VITE_FEATURE_TEAM_DEVELOPMENT = before
  return out
}

function flatten(items: readonly NavItemDef[]): NavItemDef[] {
  return items.flatMap((i) => [i, ...flatten((i.children ?? []) as NavItemDef[])])
}

function menu(nav: Nav, role: UserRole): NavItemDef[] {
  return flatten([...(nav.NAV_ITEMS_BY_ROLE[role] ?? []), ...(nav.TOOL_ITEMS_BY_ROLE[role] ?? [])])
}

const ROLES: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]

/** How each role reaches /manager/students from its menu, per build. "none" = no menu path. */
const EXPECTED: Record<"on" | "off", Record<UserRole, "row" | "studio" | "none">> = {
  // Deployed builds. The manager loses the row and reaches the page through the Studio.
  on: { user: "none", manager: "studio", "company-admin": "none", practitioner: "none", distributor: "none", "super-admin": "studio" },
  // Pilot off: no Studio in the manager's menu, so the row stays.
  off: { user: "none", manager: "row", "company-admin": "none", practitioner: "none", distributor: "none", "super-admin": "studio" },
}

describe.each([
  ["on", "true"],
  ["off", undefined],
] as const)("pilot flag %s", (which, flag) => {
  const { nav, ROUTES } = loadNav(flag)
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- hasAccess has no env dependency
  const { hasAccess } = require("@/types/roles") as typeof import("@/types/roles")

  function path(role: UserRole): "row" | "studio" | "none" {
    const items = menu(nav, role)
    if (items.some((i) => i.to === ROUTES.MANAGER.STUDENTS)) return "row"
    // The Engagement link is rendered only by the MANAGER mount of the Studio.
    if (items.some((i) => i.to === ROUTES.MANAGER.DEVELOPMENT)) return "studio"
    return "none"
  }

  it.each(ROLES)("%s", (role) => {
    const got = path(role)
    expect(got).toBe(EXPECTED[which][role])
    // A menu path is only a path if ProtectedRoute lets the role through.
    if (got !== "none") expect(hasAccess(role, ROUTES.MANAGER.STUDENTS)).toBe(true)
  })

  it("the page's route is unchanged", () => {
    expect(ROUTES.MANAGER.STUDENTS).toBe("/manager/students")
  })

  it("no role's menu has a row labelled Engagement, and labels stay unique per menu", () => {
    for (const role of ROLES) {
      const top = [...(nav.NAV_ITEMS_BY_ROLE[role] ?? []), ...(nav.TOOL_ITEMS_BY_ROLE[role] ?? [])].map((i) => i.label)
      expect(top).not.toContain("Engagement")
      expect(new Set(top).size).toBe(top.length)
    }
  })
})
