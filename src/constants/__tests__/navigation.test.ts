import {
  NAV_ITEMS_BY_ROLE,
  HOME_ROUTE_BY_ROLE,
  DEFAULT_ROLE_CONFIGS,
} from "../navigation"
import type { UserRole } from "@/types/roles"

const ALL_ROLES: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]

describe("constants/navigation", () => {
  describe("NAV_ITEMS_BY_ROLE", () => {
    it("provides nav items for every role", () => {
      for (const role of ALL_ROLES) {
        expect(NAV_ITEMS_BY_ROLE[role]).toBeDefined()
        expect(NAV_ITEMS_BY_ROLE[role].length).toBeGreaterThan(0)
      }
    })

    it("each nav item has to, icon, and label", () => {
      for (const role of ALL_ROLES) {
        for (const item of NAV_ITEMS_BY_ROLE[role]) {
          expect(typeof item.to).toBe("string")
          expect(typeof item.label).toBe("string")
          expect(item.icon).toBeDefined()
        }
      }
    })
  })

  describe("HOME_ROUTE_BY_ROLE", () => {
    it("provides a home route for every role", () => {
      for (const role of ALL_ROLES) {
        expect(typeof HOME_ROUTE_BY_ROLE[role]).toBe("string")
        expect(HOME_ROUTE_BY_ROLE[role].startsWith("/")).toBe(true)
      }
    })
  })

  describe("DEFAULT_ROLE_CONFIGS", () => {
    it("provides a config for every role", () => {
      for (const role of ALL_ROLES) {
        const config = DEFAULT_ROLE_CONFIGS[role]
        expect(config.role).toBe(role)
        expect(typeof config.label).toBe("string")
        expect(typeof config.description).toBe("string")
        expect(typeof config.homeRoute).toBe("string")
        expect(config.navItems.length).toBeGreaterThan(0)
      }
    })
  })
})
