/**
 * @jest-environment jsdom
 *
 * The distributor menu. The house-style five-item list is the only one: the
 * `distributor` switch no longer chooses it, so every switch value — absent,
 * "false" or "true" — gives the same menu. Each case loads a fresh copy of the
 * module, because a switch would be read when the module loads.
 */
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"

type NavModule = typeof import("@/constants/navigation")

function load(switchValue: "true" | "false" | null): NavModule {
  localStorage.clear()
  if (switchValue !== null) localStorage.setItem("house_style_distributor", switchValue)
  let mod: NavModule | undefined
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules needs a synchronous load
    mod = require("@/constants/navigation") as NavModule
  })
  return mod as NavModule
}

const labels = (items: NavItemDef[]) => items.map((i) => i.label)

const HOUSE: [string, string][] = [
  ["Home", "/distributor/dashboard"],
  ["My practitioners", "/distributor/network"],
  ["Credits", "/distributor/credits"],
  ["Reports", "/distributor/analytics"],
  ["Help & Support", "/help"],
]

afterEach(() => localStorage.clear())

describe("distributor menu", () => {
  it.each([null, "false", "true"] as const)("switch %s: the five-item house menu", (v) => {
    const nav = load(v)
    expect(nav.DISTRIBUTOR_NAV_ITEMS.map((i) => [i.label, i.to])).toEqual(HOUSE)
    expect(nav.NAV_ITEMS_BY_ROLE.distributor).toBe(nav.DISTRIBUTOR_NAV_ITEMS_HOUSE)
    expect(nav.DEFAULT_ROLE_CONFIGS.distributor.navItems).toBe(nav.DISTRIBUTOR_NAV_ITEMS_HOUSE)
  })

  it("no longer lists the classic entries (they still load by address)", () => {
    const nav = load("false")
    const l = labels(nav.DISTRIBUTOR_NAV_ITEMS)
    for (const gone of ["Dashboard", "Network", "Analytics", "Surveys", "Role Play", "Résumé Writer", "Settings"]) {
      expect(l).not.toContain(gone)
    }
  })

  it("the distributor switch changes no other role's menu", () => {
    const off = load(null)
    const on = load("true")
    for (const role of ["user", "manager", "company-admin", "practitioner", "super-admin"] as const) {
      expect(labels(on.NAV_ITEMS_BY_ROLE[role])).toEqual(labels(off.NAV_ITEMS_BY_ROLE[role]))
    }
  })

  it("keeps the home route, and super-admin Role Views still reaches the distributor home", () => {
    const nav = load(null)
    expect(nav.HOME_ROUTE_BY_ROLE.distributor).toBe("/distributor/dashboard")
    const roleViews = nav.SUPER_ADMIN_NAV_SECTIONS.find((s) => s.label === "Role Views")
    expect(roleViews?.items.find((i) => i.label === "Distributor")?.to).toBe("/distributor/dashboard")
  })
})
