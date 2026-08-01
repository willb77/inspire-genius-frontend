import {
  NAV_ITEMS_BY_ROLE,
  HOME_ROUTE_BY_ROLE,
  DEFAULT_ROLE_CONFIGS,
  TOOL_ITEMS_BY_ROLE,
  SUPER_ADMIN_TOOLS_SECTION,
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

  describe("Tools rollup", () => {
    it("defines tool-item arrays for manager and super-admin", () => {
      expect(Array.isArray(TOOL_ITEMS_BY_ROLE.manager)).toBe(true)
      expect(Array.isArray(TOOL_ITEMS_BY_ROLE["super-admin"])).toBe(true)
    })

    it("every tool item is well-formed (to, icon, label)", () => {
      for (const items of Object.values(TOOL_ITEMS_BY_ROLE)) {
        for (const item of items ?? []) {
          expect(typeof item.to).toBe("string")
          expect(typeof item.label).toBe("string")
          expect(item.icon).toBeDefined()
        }
      }
    })

    it("super-admin Tools section is a collapsed 'Tools' rollup or null", () => {
      if (SUPER_ADMIN_TOOLS_SECTION) {
        expect(SUPER_ADMIN_TOOLS_SECTION.label).toBe("Tools")
        expect(SUPER_ADMIN_TOOLS_SECTION.defaultCollapsed).toBe(true)
        expect(SUPER_ADMIN_TOOLS_SECTION.items.length).toBeGreaterThan(0)
      } else {
        expect(SUPER_ADMIN_TOOLS_SECTION).toBeNull()
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
