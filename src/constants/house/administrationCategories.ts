/**
 * JF-13 admin — the classic Administration section, in categories.
 *
 * Read only when `job_fit_v2` is on for the person (the three readers of
 * `SUPER_ADMIN_NAV_SECTIONS` — SuperAdminLayout, UserLayout and
 * useVerticalPageSections — decide that through `useSavedJobsEnabled()`).
 * Loading, an error or `false` never call this, so the section stays today's.
 *
 * The categories are NOT a second grouping: they are read from the house-style
 * admin menu (`HOUSE_SUPER_ADMIN_SECTIONS`) — People, Support, PRISM, AI
 * coaches, Reports, Advanced — in that order. A classic entry joins the
 * category whose house section lists its route. The house menu reaches the
 * three PRISM pages it does not list through the PRISM page's tabs
 * (`PRISM_HUB`), so a tab's route joins the category of the hub tab the house
 * menu does list.
 *
 * Only grouping moves. Each entry is the classic object itself — same route,
 * label, icon and any greying — and the owner-only filter is applied by the
 * caller BEFORE grouping, exactly as today. Two rules keep everything reachable
 * in SidebarScaffold, which renders ONE level of children:
 *
 *   - an entry that already has children (Intake and its saved views) is
 *     lifted: the entry and its children sit side by side in the category,
 *     never a level below it;
 *   - an entry no house category claims stays at the top of the section, where
 *     it is today. Dashboard (the house menu's unlabelled first entry) is one.
 *
 * A category with no entry left (e.g. everything in it filtered out) is not
 * shown, so no group opens onto nothing.
 */
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import { HOUSE_SUPER_ADMIN_SECTIONS } from "@/constants/house/superAdminNav"
import { PRISM_HUB, USAGE_HUB } from "@/pages/super-admin/house/hubs"

type Category = { label: string; icon: NavItemDef["icon"]; routes: Set<string> }

/** Path only — Intake's saved views differ from Intake by query string alone. */
const pathOf = (to: string) => to.split("?")[0]

function houseCategories(): Category[] {
  const categories = HOUSE_SUPER_ADMIN_SECTIONS.filter((s) => s.label && s.items.length > 0).map((s) => ({
    label: s.label,
    icon: s.items[0].icon,
    routes: new Set(s.items.flatMap((i) => [i.to, ...(i.children ?? []).map((c) => c.to)]).map(pathOf)),
  }))
  for (const hub of [PRISM_HUB, USAGE_HUB]) {
    const home = categories.find((c) => hub.tabs.some((t) => c.routes.has(t.to)))
    if (!home) continue
    for (const tab of hub.tabs) {
      if (!categories.some((c) => c.routes.has(tab.to))) home.routes.add(tab.to)
    }
  }
  return categories
}

/** Labels of the categories, in menu order. */
export const ADMINISTRATION_CATEGORY_LABELS: readonly string[] = HOUSE_SUPER_ADMIN_SECTIONS.filter(
  (s) => s.label && s.items.length > 0,
).map((s) => s.label)

/**
 * The Administration items (already owner-gated by the caller), grouped into
 * the house categories. Entries no category claims keep their place at the top.
 */
export function groupAdministrationItems(items: NavItemDef[]): NavItemDef[] {
  const categories = houseCategories()
  const loose: NavItemDef[] = []
  const byCategory = new Map<string, NavItemDef[]>(categories.map((c) => [c.label, []]))
  for (const item of items) {
    const home = categories.find((c) => c.routes.has(pathOf(item.to)))
    if (!home) {
      loose.push(item)
      continue
    }
    const into = byCategory.get(home.label) ?? []
    // Lift an entry's own children beside it: one level is all SidebarScaffold draws.
    const { children, ...entry } = item
    into.push(children?.length ? entry : item, ...(children ?? []))
  }
  const groups: NavItemDef[] = categories
    .filter((c) => (byCategory.get(c.label) ?? []).length > 0)
    .map((c) => ({ to: "", icon: c.icon, label: c.label, children: byCategory.get(c.label) }))
  return [...loose, ...groups]
}
