/**
 * Coach nav — the "My Students" GRANT item is present only for coach-capable
 * roles. Tests `grantSidebarSectionForRole` directly (the pure source of the
 * behaviour), which `VerticalShell` and `useEntitledVerticalItems` consume now
 * that the legacy AppSidebar has been removed (Phase 6.4). Whether the GRANT
 * section is *shown at all* is the entitlement gate (`RequireVertical` /
 * `useVerticalAccess`), covered by the vertical scaffold tests.
 */
import { grantSidebarSectionForRole, GRANT_COACH_ROLES } from "@/constants/sidebar-sections"
import type { UserRole } from "@/types/roles"

const COACH_ROLES: UserRole[] = ["practitioner", "manager", "company-admin", "super-admin"]

describe("grantSidebarSectionForRole — coach nav", () => {
  test.each(COACH_ROLES)("appends 'My Students' for coach-capable role %s", (role) => {
    const section = grantSidebarSectionForRole(role)
    const labels = section.items.map((i) => i.label)
    expect(section.label).toBe("Financial Aid")
    expect(labels).toContain("My Students")
  })

  test("does NOT append 'My Students' for a plain user", () => {
    const section = grantSidebarSectionForRole("user")
    const labels = section.items.map((i) => i.label)
    expect(section.label).toBe("Financial Aid")
    expect(labels).not.toContain("My Students")
    // The base aid pages are still present for an entitled user.
    expect(labels).toContain("Aid Dashboard")
  })

  test("GRANT_COACH_ROLES excludes plain user", () => {
    expect(GRANT_COACH_ROLES).not.toContain("user")
    expect(GRANT_COACH_ROLES).toEqual(expect.arrayContaining(COACH_ROLES))
  })
})
