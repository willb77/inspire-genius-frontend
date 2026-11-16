/**
 * Sidebar labels translate at render time through a key derived from the English
 * label (navLabels.ts). These tests pin the three things that make that safe:
 * the key is collision-free over every label the menus really declare, the
 * English file agrees with the registries, and a miss paints the label unchanged.
 */
import fs from "node:fs"
import path from "node:path"
import { navKeySegment, navLabelKey, translateNavLabel } from "../navLabels"
import * as nav from "@/constants/navigation"
import * as houseSuperAdmin from "@/constants/house/superAdminNav"
import * as houseCompanyAdmin from "@/constants/house/companyAdminNav"
import * as adminCategories from "@/constants/house/administrationCategories"
import * as sidebarSections from "@/constants/sidebar-sections"
import * as verticalSubnav from "@/constants/vertical-subnav"

const EN = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../../../../public/locales/en/shellUi.json"), "utf8"),
) as { nav: { items: Record<string, string>; sections: Record<string, string> } }

/** Every item and section label the static registries declare (both agent-engine states). */
function harvest(): { items: Set<string>; sections: Set<string> } {
  const items = new Set<string>()
  const sections = new Set<string>()
  const seen = new Set<unknown>()
  const walk = (v: unknown): void => {
    if (!v || typeof v !== "object" || seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v) || v instanceof Set) {
      for (const x of v as Iterable<unknown>) walk(x)
      return
    }
    const o = v as Record<string, unknown>
    if (typeof o.label === "string" && Array.isArray(o.items)) sections.add(o.label)
    else if (typeof o.label === "string" && ("to" in o || "icon" in o)) items.add(o.label)
    for (const k of Object.keys(o)) walk(o[k])
  }
  for (const m of [nav, houseSuperAdmin, houseCompanyAdmin, adminCategories, sidebarSections, verticalSubnav]) {
    for (const v of Object.values(m)) {
      if (typeof v === "function") {
        for (const arg of [true, false]) {
          try {
            walk((v as (a: unknown) => unknown)(arg))
          } catch {
            /* not a nav builder */
          }
        }
      } else walk(v)
    }
  }
  return { items, sections }
}

describe("navKeySegment", () => {
  it("replaces runs of non-letters with one underscore and keeps case", () => {
    expect(navKeySegment("Help & Support")).toBe("Help_Support")
    expect(navKeySegment("Cohort Read-out")).toBe("Cohort_Read_out")
    expect(navKeySegment("Cohort read-out")).toBe("Cohort_read_out")
    expect(navKeySegment("Résumé Writer")).toBe("Résumé_Writer")
    expect(navKeySegment("  ")).toBe("")
    expect(navLabelKey("sections", "Role Views")).toBe("nav.sections.Role_Views")
  })
})

describe("translateNavLabel", () => {
  it("returns the translation when there is one", () => {
    const t = (key: string) => (key === "nav.items.Home" ? "Inicio" : key)
    expect(translateNavLabel(t, "items", "Home")).toBe("Inicio")
  })

  it("returns the declared English when the key does not resolve (i18next echoes the key)", () => {
    const t = (key: string) => key
    expect(translateNavLabel(t, "items", "Brand New Entry")).toBe("Brand New Entry")
  })

  it("returns the default value when the library applies it", () => {
    const t = (_key: string, o: { defaultValue: string }) => o.defaultValue
    expect(translateNavLabel(t, "sections", "Role Views")).toBe("Role Views")
  })

  it("leaves an empty or symbol-only label alone (unlabelled sections, icons)", () => {
    const t = jest.fn(() => "x")
    expect(translateNavLabel(t, "sections", "")).toBe("")
    expect(translateNavLabel(t, "items", "—")).toBe("—")
    expect(t).not.toHaveBeenCalled()
  })
})

describe("the English nav entries against the live registries", () => {
  const live = harvest()

  it("harvests a real menu (a control: an empty harvest would pass everything below)", () => {
    expect(live.items.size).toBeGreaterThan(80)
    expect(live.sections.has("Administration")).toBe(true)
  })

  it("no two declared labels share a key", () => {
    for (const group of ["items", "sections"] as const) {
      const bySeg = new Map<string, string>()
      for (const label of live[group]) {
        const seg = navKeySegment(label)
        if (!seg) continue
        expect({ label, clash: bySeg.get(seg) }).toEqual({ label, clash: undefined })
        bySeg.set(seg, label)
      }
    }
  })

  it("every entry in the English file is keyed by its own label and is a label the menus declare", () => {
    for (const group of ["items", "sections"] as const) {
      for (const [seg, value] of Object.entries(EN.nav[group])) {
        expect(navKeySegment(value)).toBe(seg)
        expect(live[group].has(value)).toBe(true)
      }
    }
  })
})
