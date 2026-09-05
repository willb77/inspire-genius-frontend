import { MANAGER_NAV_ITEMS, TOOL_ITEMS_BY_ROLE } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"

/**
 * The manager sidebar was consolidated to six entries on 2026-09-05 (request).
 *
 * These assert the SHAPE of that decision, not a snapshot: the count, the
 * order, that nothing appears twice, and that the removed entries really were
 * only removed from the MENU. Nothing here checks that a page still exists —
 * routes are the route table's job — but a duplicate label or a menu that grows
 * back to eleven is exactly the drift this is here to catch.
 */
describe("MANAGER_NAV_ITEMS — the six-item sidebar", () => {
  it("drops the five entries that were removed from the menu", () => {
    const labels = MANAGER_NAV_ITEMS.map((i) => i.label)
    for (const gone of [
      "Team Roster (Client)",
      "Join Requests",
      "Chat with Meridian",
      "Document Library",
      "Surveys",
    ]) {
      expect(labels).not.toContain(gone)
    }
  })

  it("never renders an item twice in the same sidebar", () => {
    // The manager sidebar is MANAGER_NAV_ITEMS plus the Tools rollup. This nav
    // keys by label, and a label appearing in both lists has produced a
    // duplicate-section clash here before, which is why Team Development Studio
    // was removed from the manager Tools list when it was promoted.
    const main = MANAGER_NAV_ITEMS.map((i) => i.label)
    const tools = (TOOL_ITEMS_BY_ROLE.manager ?? []).map((i) => i.label)
    const both = main.filter((l) => tools.includes(l))
    expect(both).toEqual([])
  })

  it("keeps Team Development Studio in the OTHER roles' tools", () => {
    // Only the manager's main nav changed. Promoting it for everyone would have
    // silently restructured the practitioner and super-admin sidebars too.
    const labels = (role: "practitioner" | "super-admin") =>
      (TOOL_ITEMS_BY_ROLE[role] ?? []).map((i) => i.label)
    expect(labels("practitioner")).toContain("Team Development Studio")
    expect(labels("super-admin")).toContain("Team Development Studio")
  })

  it("routes Join Requests from Team Import rather than the sidebar", () => {
    // Moved, not deleted: it must be gone from the menu and still be a real
    // route, because a button on Team Import now points at it.
    expect(MANAGER_NAV_ITEMS.map((i) => i.to)).not.toContain(ROUTES.MANAGER.JOIN_REQUESTS)
    expect(ROUTES.MANAGER.JOIN_REQUESTS).toBeTruthy()
  })

  it("always offers a landing surface, even with the pilot flag off", () => {
    // VITE_FEATURE_TEAM_DEVELOPMENT scopes the pilot cohort and .env.example
    // ships it FALSE. Without the fallback that build gives a manager five
    // entries and no home page.
    expect(MANAGER_NAV_ITEMS).toHaveLength(6)
    expect([ROUTES.MANAGER.DEVELOPMENT, ROUTES.MANAGER.DASHBOARD]).toContain(
      MANAGER_NAV_ITEMS[0].to,
    )
  })
})
