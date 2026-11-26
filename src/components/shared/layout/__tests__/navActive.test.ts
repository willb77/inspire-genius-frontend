/**
 * RM-7 — `activePaths` on a sidebar row, and the guarantee that a row WITHOUT
 * it is lit exactly as before. SidebarScaffold reads this rule for every row on
 * every authenticated page, so the "as before" half is checked over every row
 * the static menus declare, against the rule as it was written until RM-7.
 */
import "@/verticals"
import * as nav from "@/constants/navigation"
import * as sidebarSections from "@/constants/sidebar-sections"
import * as verticalSubnav from "@/constants/vertical-subnav"
import { isItemActive, pathIsAt, type NavActiveFields } from "../navActive"

/** The rule before RM-7, verbatim from SidebarScaffold. */
const before = (pathname: string, item: Pick<NavActiveFields, "to" | "activePrefix">) =>
  item.activePrefix ? pathname.startsWith(item.activePrefix) : item.to !== "" && pathname === item.to

function harvest(): NavActiveFields[] {
  const out: NavActiveFields[] = []
  const seen = new Set<unknown>()
  const walk = (v: unknown): void => {
    if (!v || typeof v !== "object" || seen.has(v)) return
    seen.add(v)
    if (Array.isArray(v) || v instanceof Set) {
      for (const x of v as Iterable<unknown>) walk(x)
      return
    }
    const o = v as Record<string, unknown>
    if (typeof o.to === "string" && typeof o.label === "string") out.push(o as unknown as NavActiveFields)
    for (const k of Object.keys(o)) walk(o[k])
  }
  for (const m of [nav, sidebarSections, verticalSubnav]) for (const v of Object.values(m)) walk(v)
  return out
}

describe("RM-7 — isItemActive", () => {
  it("a row without activePaths is lit exactly as before, on every page any menu links to", () => {
    const rows = harvest()
    expect(rows.length).toBeGreaterThan(100)
    expect(rows.filter((r) => r.activePaths)).toEqual([])
    const pages = [...new Set(rows.flatMap((r) => [r.to, `${r.to}/x`, r.activePrefix ?? ""]))].filter(Boolean)
    let pairs = 0
    for (const row of rows) {
      for (const page of pages) {
        if (isItemActive(page, row) !== before(page, row)) {
          expect({ row: row.to, page, now: isItemActive(page, row) }).toEqual({ row: row.to, page, now: before(page, row) })
        }
        pairs++
      }
    }
    expect(pairs).toBeGreaterThan(10_000)
  })

  it("a row with activePaths is lit on each of them and the pages under them, and on nothing else", () => {
    const row = { to: "/manager/job-dna", activePaths: ["/manager/job-dna", "/manager/job-blueprint", "/vertical/job-blueprint"] }
    for (const page of ["/manager/job-dna", "/manager/job-blueprint", "/vertical/job-blueprint/dashboard", "/vertical/job-blueprint/dna/7"]) {
      expect({ page, lit: isItemActive(page, row) }).toEqual({ page, lit: true })
    }
    for (const page of ["/manager/job-blueprints", "/manager/job-dna-x", "/vertical/job-blueprint-x", "/manager", "/"]) {
      expect({ page, lit: isItemActive(page, row) }).toEqual({ page, lit: false })
    }
  })

  it("activePaths adds to activePrefix and to; it never takes away", () => {
    const row = { to: "/a", activePrefix: "/a", activePaths: ["/b"] }
    expect(isItemActive("/a/1", row)).toBe(true)
    expect(isItemActive("/b", row)).toBe(true)
    expect(isItemActive("/c", row)).toBe(false)
    expect(isItemActive("/x", { to: "/x", activePaths: [] })).toBe(true)
  })

  it("pathIsAt: the page or a page under it, never a sibling that shares a prefix, never an empty path", () => {
    expect(pathIsAt("/manager/interviews", "/manager/interviews")).toBe(true)
    expect(pathIsAt("/manager/interviews/9", "/manager/interviews")).toBe(true)
    expect(pathIsAt("/manager/interview-live", "/manager/interview")).toBe(false)
    expect(pathIsAt("/anything", "")).toBe(false)
  })
})
