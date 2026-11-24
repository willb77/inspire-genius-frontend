/**
 * @jest-environment jsdom
 *
 * A manager's home follows the Team Development Studio build flag: the Studio
 * when the flag is on (the Studio leads their menu and the Dashboard is not in
 * it), the Dashboard when it is off. The flag is read when the module loads, so
 * each case loads a fresh copy of the module under its own flag value.
 *
 * jest leaves the flag unset, so without this file only the flag-off arm is
 * ever exercised.
 */
type NavModule = typeof import("@/constants/navigation")

const FLAG = "VITE_FEATURE_TEAM_DEVELOPMENT"
const STUDIO = "/manager/development"
const DASHBOARD = "/manager/dashboard"
const OTHER_ROLES = ["user", "company-admin", "practitioner", "distributor", "super-admin"] as const

function load(flag: "true" | "false" | null): NavModule {
  if (flag === null) delete process.env[FLAG]
  else process.env[FLAG] = flag
  let mod: NavModule | undefined
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules needs a synchronous load
    mod = require("@/constants/navigation") as NavModule
  })
  return mod as NavModule
}

const original = process.env[FLAG]
afterEach(() => {
  if (original === undefined) delete process.env[FLAG]
  else process.env[FLAG] = original
})

describe("manager home route", () => {
  describe("Studio flag on", () => {
    it("the home-route map sends a manager to the Studio", () => {
      expect(load("true").HOME_ROUTE_BY_ROLE.manager).toBe(STUDIO)
    })

    it("the role config sends a manager to the Studio", () => {
      expect(load("true").DEFAULT_ROLE_CONFIGS.manager.homeRoute).toBe(STUDIO)
    })

    it("the home is the first entry of the manager menu", () => {
      const nav = load("true")
      expect(nav.MANAGER_NAV_ITEMS[0].to).toBe(STUDIO)
      expect(nav.HOME_ROUTE_BY_ROLE.manager).toBe(nav.MANAGER_NAV_ITEMS[0].to)
    })
  })

  describe.each([null, "false"] as const)("Studio flag off (%s)", (flag) => {
    it("the home-route map sends a manager to the Dashboard", () => {
      expect(load(flag).HOME_ROUTE_BY_ROLE.manager).toBe(DASHBOARD)
    })

    it("the role config sends a manager to the Dashboard", () => {
      expect(load(flag).DEFAULT_ROLE_CONFIGS.manager.homeRoute).toBe(DASHBOARD)
    })

    it("the home is the first entry of the manager menu", () => {
      const nav = load(flag)
      expect(nav.MANAGER_NAV_ITEMS[0].to).toBe(DASHBOARD)
      expect(nav.HOME_ROUTE_BY_ROLE.manager).toBe(nav.MANAGER_NAV_ITEMS[0].to)
    })
  })

  it("the flag moves no other role's home", () => {
    const on = load("true")
    const off = load(null)
    for (const role of OTHER_ROLES) {
      expect(on.HOME_ROUTE_BY_ROLE[role]).toBe(off.HOME_ROUTE_BY_ROLE[role])
      expect(on.DEFAULT_ROLE_CONFIGS[role].homeRoute).toBe(off.DEFAULT_ROLE_CONFIGS[role].homeRoute)
    }
    // Pinned as literals too, so a change to both arms at once is still seen.
    expect(OTHER_ROLES.map((r) => on.HOME_ROUTE_BY_ROLE[r])).toEqual([
      "/home",
      "/company-admin/dashboard",
      "/practitioner/home",
      "/distributor/dashboard",
      "/home",
    ])
  })

  it("the super-admin Manager role view still points at the Dashboard under both values", () => {
    for (const flag of ["true", null] as const) {
      const roleViews = load(flag).SUPER_ADMIN_NAV_SECTIONS.find((s) => s.label === "Role Views")
      expect(roleViews?.items.find((i) => i.label === "Manager")?.to).toBe(DASHBOARD)
    }
  })
})
