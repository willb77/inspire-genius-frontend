import { NAV_ITEMS_BY_ROLE, SUPER_ADMIN_NAV_ITEMS, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { hasAccess } from "@/types/roles"

// N-3 follow-up: a super-admin reaches the cohort read-out from Administration.
// The company-admin's entry stays the gated one useGatedNavItems adds; the
// static company-admin menu is not touched.
describe("Administration → Cohort Read-out (super-admin)", () => {
  it("is in the super-admin Administration section, once", () => {
    const rows = SUPER_ADMIN_NAV_ITEMS.filter((i) => i.label === "Cohort Read-out")
    expect(rows).toHaveLength(1)
    expect(rows[0].to).toBe(ROUTES.SUPER_ADMIN.COHORT_READOUT)
    const admin = SUPER_ADMIN_NAV_SECTIONS.find((s) => s.label === "Administration")
    expect(admin?.items.some((i) => i.to === ROUTES.SUPER_ADMIN.COHORT_READOUT)).toBe(true)
  })

  it("adds nothing to the static company-admin menu", () => {
    expect(NAV_ITEMS_BY_ROLE["company-admin"].filter((i) => i.to.includes("cohort-readout"))).toEqual([])
  })

  it("sits under the role-gated /super-admin prefix", () => {
    expect(hasAccess("super-admin", ROUTES.SUPER_ADMIN.COHORT_READOUT)).toBe(true)
    for (const role of ["user", "manager", "company-admin", "practitioner", "distributor"]) {
      expect({ role, ok: hasAccess(role, ROUTES.SUPER_ADMIN.COHORT_READOUT) }).toEqual({ role, ok: false })
    }
  })
})
