import { SUPER_ADMIN_NAV_ITEMS, SUPER_ADMIN_NAV_SECTIONS } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import {
  ADMIN_HOME_LABEL,
  HOUSE_SUPER_ADMIN_SECTIONS,
  VIEW_AS_OPTIONS,
} from "@/constants/house/superAdminNav"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import { PRISM_HUB, USAGE_HUB } from "@/pages/super-admin/house/hubs"

function allRoutes(items: NavItemDef[]): string[] {
  return items.flatMap((i) => [i.to, ...allRoutes(i.children ?? [])])
}

const houseItems = HOUSE_SUPER_ADMIN_SECTIONS.flatMap((s) => s.items)
const houseRoutes = new Set(allRoutes(houseItems))

// A page on a tabbed hub is reachable when the menu links to any of its tabs.
const hubRoutes = [PRISM_HUB, USAGE_HUB].flatMap((hub) =>
  hub.tabs.some((t) => houseRoutes.has(t.to)) ? hub.tabs.map((t) => t.to) : [],
)
const reachable = new Set([...houseRoutes, ...hubRoutes])

describe("house-style super-admin menu", () => {
  it("is six groups plus a closed Advanced group, in menu order", () => {
    expect(HOUSE_SUPER_ADMIN_SECTIONS.map((s) => s.label)).toEqual([
      "",
      "People",
      "Support",
      "PRISM",
      "AI coaches",
      "Reports",
      "Advanced",
    ])
    const advanced = HOUSE_SUPER_ADMIN_SECTIONS.find((s) => s.label === "Advanced")
    expect(advanced?.defaultCollapsed).toBe(true)
    expect(HOUSE_SUPER_ADMIN_SECTIONS[0].items).toEqual([
      expect.objectContaining({ to: ROUTES.SUPER_ADMIN.DASHBOARD, label: ADMIN_HOME_LABEL }),
    ])
  })

  it("still reaches every page the classic Administration menu reaches", () => {
    // Regrouping is display only: dropping a page here would hide it.
    const classic = allRoutes(SUPER_ADMIN_NAV_ITEMS)
    expect(classic.length).toBeGreaterThan(20)
    const missing = classic.filter((r) => !reachable.has(r))
    expect(missing).toEqual([])
  })

  it("adds no destination the classic menu does not already have", () => {
    const classic = new Set(allRoutes(SUPER_ADMIN_NAV_ITEMS))
    expect([...houseRoutes].filter((r) => !classic.has(r))).toEqual([])
  })

  it("lists PRISM once; the PRISM page's tabs reach the rest", () => {
    const prism = HOUSE_SUPER_ADMIN_SECTIONS.find((s) => s.label === "PRISM")
    expect(prism?.items.map((i) => i.to)).toEqual([ROUTES.SUPER_ADMIN.PRISM_MANAGEMENT])
    for (const tab of PRISM_HUB.tabs) expect(reachable.has(tab.to)).toBe(true)
  })

  it("lists each page once, with a unique label", () => {
    const tops = houseItems.map((i) => i.to)
    expect(new Set(tops).size).toBe(tops.length)
    const labels = houseItems.map((i) => i.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("uses the plain words, not the engineering names", () => {
    const labels = houseItems.map((i) => i.label)
    expect(labels).toEqual(
      expect.arrayContaining([
        "Coach feedback review",
        "Data deletion requests",
        "AI usage & health",
        "Why the AI answered",
        "Add people",
      ]),
    )
    for (const jargon of ["RLHF Training", "Privacy & RTBF", "Observability", "Explainability", "Bulk User Import"]) {
      expect(labels).not.toContain(jargon)
    }
  })

  it("keeps the owner-only Dev Traffic Report entry so the layout can filter it", () => {
    expect(houseRoutes.has(ROUTES.SUPER_ADMIN.DEV_TRAFFIC_REPORT)).toBe(true)
  })

  it("View as… opens exactly the classic Role Views destinations", () => {
    const roleViews = SUPER_ADMIN_NAV_SECTIONS.find((s) => s.label === "Role Views")
    expect(VIEW_AS_OPTIONS.map((o) => o.to)).toEqual(roleViews?.items.map((i) => i.to))
  })
})
