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
import { CAREERS_AND_JOBS_LABEL } from "@/constants/vertical-subnav"
import { MY_WORKSPACE_SECTION_LABEL } from "@/constants/navigation"
import { CAREER_STUDIO_LABEL, TALENT_STUDIO_LABEL, TOOLS_SECTION_LABEL } from "@/hooks/nav/useToolsSection"
import { listVerticals } from "@/verticals/core"
import "@/verticals"

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

/**
 * RM-8 — the labels the static walk above cannot see, because they are built
 * inside hooks (Tools, Talent Studio, Bio Capture, PRISM Exam, My Workspace) or
 * come from the vertical registry (a launcher row and a vertical page's section
 * are both the manifest title). Without these, a sidebar row could ship with no
 * key and paint in English in every language, and nothing would fail.
 */
const HOOK_SOURCES = [
  "src/hooks/nav/useToolsSection.ts",
  "src/hooks/nav/useGatedNavItems.ts",
  "src/hooks/nav/useSuperAdminSections.ts",
  "src/hooks/nav/useVerticalPageSections.ts",
  "src/components/layout/useVerticalLauncher.ts",
]

const ROOT = path.resolve(__dirname, "../../../../..")

/** Every `label: "…"` literal in the hook sources (all of them are menu items). */
function hookItemLabels(): Set<string> {
  const out = new Set<string>()
  for (const rel of HOOK_SOURCES) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8")
    for (const m of src.matchAll(/label:\s*"([^"]+)"/g)) out.add(m[1])
  }
  return out
}

/** Static walk + hook-built labels + vertical titles: everything a sidebar can paint. */
function declared(): { items: Set<string>; sections: Set<string> } {
  const { items, sections } = harvest()
  for (const l of hookItemLabels()) items.add(l)
  for (const l of [TALENT_STUDIO_LABEL, CAREER_STUDIO_LABEL, CAREERS_AND_JOBS_LABEL]) items.add(l)
  for (const l of [TOOLS_SECTION_LABEL, MY_WORKSPACE_SECTION_LABEL, CAREERS_AND_JOBS_LABEL]) sections.add(l)
  for (const v of listVerticals()) {
    items.add(v.title)
    sections.add(v.title)
  }
  return { items, sections }
}

/** The shellUi locales (decision D1: en plus the six target languages; the other 15 have no shellUi file). */
const SHELL_LOCALES = ["en", "es", "fr", "pt", "it", "pl", "cs"] as const

function readLocale(lang: string): { nav: { items: Record<string, string>; sections: Record<string, string> } } {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "public/locales", lang, "shellUi.json"), "utf8"))
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
  const live = declared()

  it("harvests a real menu (a control: an empty harvest would pass everything below)", () => {
    expect(live.items.size).toBeGreaterThan(80)
    expect(live.sections.has("Administration")).toBe(true)
    // The hook-built and registry labels are in it too (RM-8).
    expect(hookItemLabels().has("Bio Capture Studio")).toBe(true)
    expect(hookItemLabels().has("PRISM Exam")).toBe(true)
    expect(live.sections.has("Tools")).toBe(true)
    expect(live.items.has("Talent Studio")).toBe(true)
    expect(listVerticals().length).toBeGreaterThan(5)
  })

  it("every declared label has its key in every shellUi locale (a missing key paints English)", () => {
    const missing: string[] = []
    for (const lang of SHELL_LOCALES) {
      const file = readLocale(lang)
      for (const group of ["items", "sections"] as const) {
        for (const label of live[group]) {
          const seg = navKeySegment(label)
          if (!seg) continue
          if (typeof file.nav[group][seg] !== "string" || !file.nav[group][seg]) missing.push(`${lang} ${group} ${label}`)
        }
      }
    }
    expect(missing).toEqual([])
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
