/**
 * House-style company-admin menu (Wave 2, area switch `company-admin`).
 *
 * With the switch on, the company-admin menu is the classic list with display
 * changes:
 *   - "User Management" reads "People", the title of the page it opens;
 *   - the company-admin Settings page (`/company-admin/settings`, a placeholder
 *     with sample figures) is never listed. Since RM-4 the classic list no
 *     longer carries it either: Settings is in the footer section and opens the
 *     shared `/settings` page, the same one the profile picture opens;
 *   - Help & Support is no longer appended here (RM-4, 2026-11-25): it is in
 *     the footer section beside Settings, for every role (RM-D2). Appending it
 *     here as well would list it twice.
 *
 *   - Bulk Import, Culture Docs and AI Observability are tabs of the People,
 *     Organization and Analytics hubs (RM-5, 2026-11-26), not menu rows.
 *
 * Costs is not in the classic menu either, so there is nothing to remove for it.
 *
 * Display only. Every route still loads by address, and nothing here decides
 * what a company admin may open. The switch is read when the menu is built
 * (each render), so it never depends on module load order.
 */
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import { ROUTES } from "@/constants/routes"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"

/** Routes the house-style menu leaves out (still reachable by address). */
export const COMPANY_ADMIN_HOUSE_HIDDEN_ROUTES: ReadonlySet<string> = new Set<string>([
  ROUTES.COMPANY_ADMIN.SETTINGS,
  ROUTES.COMPANY_ADMIN.COSTS,
  // RM-5 (2026-11-26): each of these is now a tab of a hub, one click from its
  // hub row and still opened by its own address — Bulk import in People,
  // Culture Docs in Organization, AI Observability in Analytics (see
  // src/pages/company-admin/house/hubs.ts). Cohort Read-out, which is added
  // after this filter, is left out in useGatedNavItems for the same reason.
  ROUTES.COMPANY_ADMIN.BULK_IMPORT,
  ROUTES.COMPANY_ADMIN.CULTURE,
  ROUTES.COMPANY_ADMIN.OBSERVABILITY,
])

/** The house-style version of a company-admin menu built from the classic list. */
export function companyAdminHouseMenu(classic: readonly NavItemDef[]): NavItemDef[] {
  return classic
    .filter((i) => !COMPANY_ADMIN_HOUSE_HIDDEN_ROUTES.has(i.to))
    .map((i) => (i.to === ROUTES.COMPANY_ADMIN.USERS ? { ...i, label: "People" } : i))
}

/**
 * A role's base menu, with the house-style company-admin menu swapped in when
 * the role is company-admin and the `company-admin` switch is on. Any other
 * role, or the switch off, gets `items` back unchanged (same array).
 */
export function withCompanyAdminHouseMenu(role: string, items: NavItemDef[]): NavItemDef[] {
  if (role !== "company-admin" || !isHouseStyleOn("company-admin")) return items
  return companyAdminHouseMenu(items)
}
