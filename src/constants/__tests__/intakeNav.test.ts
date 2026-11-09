import {
  NAV_ITEMS_BY_ROLE,
  SUPER_ADMIN_NAV_ITEMS,
  SUPER_ADMIN_NAV_SECTIONS,
  TOOL_ITEMS_BY_ROLE,
  getUserNavItems,
} from "@/constants/navigation"
import { INTAKE_PRESETS, intakePresetHref } from "@/constants/intake"
import { ROUTES } from "@/constants/routes"
import { hasAccess } from "@/types/roles"
import { filtersFromView, viewFromSearch } from "@/pages/super-admin/intake/intakeView"
import { reportFiltersFromView, reportViewFromSearch } from "@/pages/super-admin/intake/reportView"

// IN-3: Administration → Intake is super-admin ONLY. It holds personal data of
// members of the public; no other role's menu may point at it.
describe("Administration → Intake nav (super-admin only)", () => {
  const isIntake = (to: string) => to.startsWith(ROUTES.SUPER_ADMIN.INTAKE)
  const flatten = (items: { to: string; label: string; children?: { to: string; label: string }[] }[]) =>
    items.flatMap((i) => [i, ...(i.children ?? [])])

  it("is in the super-admin Administration section once, right after Practitioner Registry", () => {
    const rows = SUPER_ADMIN_NAV_ITEMS.filter((i) => i.label === "Intake")
    expect(rows).toHaveLength(1)
    expect(rows[0].to).toBe(ROUTES.SUPER_ADMIN.INTAKE)
    const labels = SUPER_ADMIN_NAV_ITEMS.map((i) => i.label)
    expect(labels.indexOf("Intake")).toBe(labels.indexOf("Practitioner Registry") + 1)
    const admin = SUPER_ADMIN_NAV_SECTIONS.find((s) => s.label === "Administration")
    expect(admin?.items.some((i) => i.to === ROUTES.SUPER_ADMIN.INTAKE)).toBe(true)
  })

  it("has the four saved views as children, each with a distinct link (sub-items are keyed by `to`)", () => {
    const intake = SUPER_ADMIN_NAV_ITEMS.find((i) => i.label === "Intake")
    const children = intake?.children ?? []
    expect(children.map((c) => c.label)).toEqual(["HR", "Recruiters", "Companies", "Coaches"])
    expect(new Set(children.map((c) => c.to)).size).toBe(4)
    for (const c of children) expect(c.to.startsWith(`${ROUTES.SUPER_ADMIN.INTAKE}?`)).toBe(true)
  })

  it("is in no other role's menu or tools", () => {
    const roles = Object.keys(NAV_ITEMS_BY_ROLE).filter((r) => r !== "super-admin") as (keyof typeof NAV_ITEMS_BY_ROLE)[]
    expect(roles.length).toBeGreaterThanOrEqual(5)
    for (const role of roles) {
      expect({ role, hits: flatten(NAV_ITEMS_BY_ROLE[role]).filter((i) => isIntake(i.to) || i.label === "Intake") }).toEqual({
        role,
        hits: [],
      })
    }
    for (const [role, items] of Object.entries(TOOL_ITEMS_BY_ROLE)) {
      expect({ role, hits: flatten(items ?? []).filter((i) => isIntake(i.to)) }).toEqual({ role, hits: [] })
    }
    for (const on of [true, false]) {
      expect(flatten(getUserNavItems(on)).filter((i) => isIntake(i.to))).toEqual([])
    }
  })

  it("the route sits under the role-gated /super-admin prefix", () => {
    expect(hasAccess("super-admin", ROUTES.SUPER_ADMIN.INTAKE)).toBe(true)
    for (const role of ["user", "manager", "company-admin", "practitioner", "distributor"]) {
      expect({ role, ok: hasAccess(role, ROUTES.SUPER_ADMIN.INTAKE) }).toEqual({ role, ok: false })
    }
  })
})

// IN-7: the saved views open the Reports tab, and the filter reaches the
// reports API end to end: href → URL → report view → report filters.
describe("Intake saved views → report filters (IN-7)", () => {
  const search = (key: string) => {
    const preset = INTAKE_PRESETS.find((p) => p.key === key)
    if (!preset) throw new Error(key)
    return new URLSearchParams(intakePresetHref(preset).split("?")[1])
  }

  it.each([
    ["hr", { role: ["hr"] }],
    ["recruiters", { role: ["recruiter"] }],
    ["companies", { segment_context: "company" }],
    ["coaches", { role: ["career_coach", "education_coach"] }],
  ])("%s", (key, expected) => {
    expect(reportFiltersFromView(reportViewFromSearch(search(key)))).toEqual(expected)
  })

  it("every preset opens the Reports tab", () => {
    for (const p of INTAKE_PRESETS) expect(search(p.key).get("tab")).toBe("reports")
  })
})

// Switching to Registrations from a preset keeps the filter: href → URL → list view → API filters.
describe("Intake saved views → registration filters", () => {
  const filtersFor = (key: string) => {
    const preset = INTAKE_PRESETS.find((p) => p.key === key)
    if (!preset) throw new Error(key)
    const href = intakePresetHref(preset)
    return filtersFromView(viewFromSearch(new URLSearchParams(href.split("?")[1])))
  }

  it.each([
    ["hr", { role: ["hr"] }],
    ["recruiters", { role: ["recruiter"] }],
    ["companies", { segment_context: "company" }],
    ["coaches", { role: ["career_coach", "education_coach"] }],
  ])("%s", (key, expected) => {
    expect(filtersFor(key)).toEqual(expected)
  })

  it("hrefs are exactly the documented query strings", () => {
    expect(INTAKE_PRESETS.map(intakePresetHref)).toEqual([
      "/super-admin/intake?tab=reports&role=hr",
      "/super-admin/intake?tab=reports&role=recruiter",
      "/super-admin/intake?tab=reports&segment_context=company",
      "/super-admin/intake?tab=reports&role=career_coach&role=education_coach",
    ])
  })
})
