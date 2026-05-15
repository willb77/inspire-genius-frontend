import { ROLE_HIERARCHY, ROLE_LABELS, isUserRole, hasAccess } from "../roles"
import type { UserRole } from "../roles"

describe("types/roles", () => {
  describe("ROLE_HIERARCHY", () => {
    it("defines all 6 roles with ascending privilege", () => {
      const roles: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]
      expect(Object.keys(ROLE_HIERARCHY)).toHaveLength(6)
      for (let i = 1; i < roles.length; i++) {
        expect(ROLE_HIERARCHY[roles[i]]).toBeGreaterThan(ROLE_HIERARCHY[roles[i - 1]])
      }
    })
  })

  describe("ROLE_LABELS", () => {
    it("has a label for every UserRole", () => {
      const roles: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]
      for (const role of roles) {
        expect(ROLE_LABELS[role]).toBeDefined()
        expect(typeof ROLE_LABELS[role]).toBe("string")
      }
    })

    it("has labels for legacy roles", () => {
      expect(ROLE_LABELS["admin"]).toBe("Admin")
      expect(ROLE_LABELS["manager-admin"]).toBe("Manager Admin")
    })
  })

  describe("isUserRole", () => {
    it("returns true for valid UserRole strings", () => {
      expect(isUserRole("user")).toBe(true)
      expect(isUserRole("manager")).toBe(true)
      expect(isUserRole("company-admin")).toBe(true)
      expect(isUserRole("practitioner")).toBe(true)
      expect(isUserRole("distributor")).toBe(true)
      expect(isUserRole("super-admin")).toBe(true)
    })

    it("returns false for invalid/null/undefined values", () => {
      expect(isUserRole(null)).toBe(false)
      expect(isUserRole(undefined)).toBe(false)
      expect(isUserRole("")).toBe(false)
      expect(isUserRole("coach-admin")).toBe(false)
      expect(isUserRole("org-admin")).toBe(false)
      expect(isUserRole("prompt-engineer")).toBe(false)
      expect(isUserRole("unknown")).toBe(false)
    })
  })

  describe("hasAccess", () => {
    it("grants super-admin access to all role prefixes", () => {
      expect(hasAccess("super-admin", "/super-admin/dashboard")).toBe(true)
      expect(hasAccess("super-admin", "/manager/dashboard")).toBe(true)
      expect(hasAccess("super-admin", "/company-admin/dashboard")).toBe(true)
      expect(hasAccess("super-admin", "/practitioner/dashboard")).toBe(true)
      expect(hasAccess("super-admin", "/distributor/dashboard")).toBe(true)
    })

    it("denies user access to all admin paths", () => {
      expect(hasAccess("user", "/super-admin/dashboard")).toBe(false)
      expect(hasAccess("user", "/manager/dashboard")).toBe(false)
      expect(hasAccess("user", "/company-admin/dashboard")).toBe(false)
      expect(hasAccess("user", "/practitioner/dashboard")).toBe(false)
      expect(hasAccess("user", "/distributor/dashboard")).toBe(false)
    })

    it("grants user access to /home", () => {
      expect(hasAccess("user", "/home")).toBe(true)
    })

    it("grants manager access to /manager paths but not /super-admin", () => {
      expect(hasAccess("manager", "/manager/dashboard")).toBe(true)
      expect(hasAccess("manager", "/super-admin/dashboard")).toBe(false)
    })

    it("grants company-admin access to /company-admin paths", () => {
      expect(hasAccess("company-admin", "/company-admin/dashboard")).toBe(true)
      expect(hasAccess("company-admin", "/super-admin/dashboard")).toBe(false)
    })

    it("grants practitioner access to /practitioner paths", () => {
      expect(hasAccess("practitioner", "/practitioner/clients")).toBe(true)
      expect(hasAccess("practitioner", "/super-admin/dashboard")).toBe(false)
    })

    it("grants distributor access to /distributor paths", () => {
      expect(hasAccess("distributor", "/distributor/practitioners")).toBe(true)
      expect(hasAccess("distributor", "/super-admin/dashboard")).toBe(false)
    })

    it("handles null/undefined role gracefully", () => {
      expect(hasAccess(null, "/home")).toBe(false)
      expect(hasAccess(undefined, "/super-admin/dashboard")).toBe(false)
    })
  })
})
