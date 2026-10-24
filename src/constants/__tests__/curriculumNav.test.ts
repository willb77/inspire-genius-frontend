import {
  NAV_ITEMS_BY_ROLE,
  SUPER_ADMIN_NAV_ITEMS,
  SUPER_ADMIN_NAV_SECTIONS,
  TOOL_ITEMS_BY_ROLE,
  getUserNavItems,
} from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { hasAccess } from "@/types/roles"

// CUR-2, decision E2: Administration → Curriculum is super-admin ONLY.
// No company-admin (or any other role) entry, and the route prefix keeps
// every other role out even by typed URL.
describe("Administration → Curriculum nav (super-admin only)", () => {
  const isCurriculum = (to: string) => to.startsWith(ROUTES.SUPER_ADMIN.CURRICULUM)

  it("is in the super-admin Administration section, once", () => {
    const rows = SUPER_ADMIN_NAV_ITEMS.filter((i) => i.label === "Curriculum")
    expect(rows).toHaveLength(1)
    expect(rows[0].to).toBe(ROUTES.SUPER_ADMIN.CURRICULUM)
    const admin = SUPER_ADMIN_NAV_SECTIONS.find((s) => s.label === "Administration")
    expect(admin?.items.some((i) => i.to === ROUTES.SUPER_ADMIN.CURRICULUM)).toBe(true)
  })

  it("is in no other role's menu or tools", () => {
    const roles = Object.keys(NAV_ITEMS_BY_ROLE).filter((r) => r !== "super-admin") as (keyof typeof NAV_ITEMS_BY_ROLE)[]
    expect(roles.length).toBeGreaterThanOrEqual(5)
    for (const role of roles) {
      expect(NAV_ITEMS_BY_ROLE[role].filter((i) => isCurriculum(i.to) || i.label === "Curriculum")).toEqual([])
    }
    for (const [role, items] of Object.entries(TOOL_ITEMS_BY_ROLE)) {
      expect({ role, hits: (items ?? []).filter((i) => isCurriculum(i.to)) }).toEqual({ role, hits: [] })
    }
    for (const on of [true, false]) {
      expect(getUserNavItems(on).filter((i) => isCurriculum(i.to))).toEqual([])
    }
  })

  it("routes sit under the role-gated /super-admin prefix", () => {
    const catalog = ROUTES.SUPER_ADMIN.CURRICULUM_CATALOG.replace(":catalogId", "c1")
    for (const path of [ROUTES.SUPER_ADMIN.CURRICULUM, catalog]) {
      expect(hasAccess("super-admin", path)).toBe(true)
      for (const role of ["user", "manager", "company-admin", "practitioner", "distributor"]) {
        expect({ role, path, ok: hasAccess(role, path) }).toEqual({ role, path, ok: false })
      }
    }
  })
})
