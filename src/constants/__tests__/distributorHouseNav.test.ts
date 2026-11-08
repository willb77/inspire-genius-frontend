/**
 * @jest-environment jsdom
 *
 * The distributor menu under the `distributor` house-style switch. The list is
 * chosen when the module loads (a switch change applies on reload), so each
 * case loads a fresh copy of the module.
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

const CLASSIC = ["Dashboard", "Network", "Analytics", "Surveys", "Role Play", "Résumé Writer", "Settings"]

afterEach(() => localStorage.clear())

describe("distributor menu", () => {
  it.each([null, "false"] as const)("switch %s: today's menu, unchanged", (v) => {
    const nav = load(v)
    expect(labels(nav.DISTRIBUTOR_NAV_ITEMS)).toEqual(CLASSIC)
    expect(nav.NAV_ITEMS_BY_ROLE.distributor).toBe(nav.DISTRIBUTOR_NAV_ITEMS)
    expect(nav.DEFAULT_ROLE_CONFIGS.distributor.navItems).toBe(nav.DISTRIBUTOR_NAV_ITEMS)
  })

  it("switch ON: five items with Credits and Help", () => {
    const nav = load("true")
    expect(nav.DISTRIBUTOR_NAV_ITEMS.map((i) => [i.label, i.to])).toEqual([
      ["Home", "/distributor/dashboard"],
      ["My practitioners", "/distributor/network"],
      ["Credits", "/distributor/credits"],
      ["Reports", "/distributor/analytics"],
      ["Help & Support", "/help"],
    ])
    expect(nav.NAV_ITEMS_BY_ROLE.distributor).toBe(nav.DISTRIBUTOR_NAV_ITEMS_HOUSE)
    expect(nav.DEFAULT_ROLE_CONFIGS.distributor.navItems).toBe(nav.DISTRIBUTOR_NAV_ITEMS_HOUSE)
  })

  it("switch ON changes no other role's menu", () => {
    const off = load(null)
    const on = load("true")
    for (const role of ["user", "manager", "company-admin", "practitioner", "super-admin"] as const) {
      expect(labels(on.NAV_ITEMS_BY_ROLE[role])).toEqual(labels(off.NAV_ITEMS_BY_ROLE[role]))
    }
  })

  it("switch ON keeps the home route", () => {
    const nav = load("true")
    expect(nav.HOME_ROUTE_BY_ROLE.distributor).toBe("/distributor/dashboard")
  })
})
