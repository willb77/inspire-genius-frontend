/**
 * House-style company-admin menu (Wave 2, area switch `company-admin`).
 *
 * With the switch on, the company-admin menu is the classic list with three
 * display changes:
 *   - "User Management" reads "People", the title of the page it opens;
 *   - Settings leaves the menu (the company-admin Settings page shows nothing
 *     real yet). Account settings stay one click away under the profile
 *     picture, which goes to the shared `/settings` page for this role;
 *   - "Help & Support" is added at the end, as every other role has it.
 *
 * Costs is not in the classic menu either, so there is nothing to remove for it.
 *
 * Display only. Every route still loads by address, and nothing here decides
 * what a company admin may open. The switch is read when the menu is built
 * (each render), so it never depends on module load order.
 */
import { HelpCircle } from "lucide-react"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import { ROUTES } from "@/constants/routes"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"

export const COMPANY_ADMIN_HOUSE_HELP_ITEM: NavItemDef = {
  to: ROUTES.HELP,
  icon: HelpCircle,
  label: "Help & Support",
}

/** Routes the house-style menu leaves out (still reachable by address). */
export const COMPANY_ADMIN_HOUSE_HIDDEN_ROUTES: ReadonlySet<string> = new Set<string>([
  ROUTES.COMPANY_ADMIN.SETTINGS,
  ROUTES.COMPANY_ADMIN.COSTS,
])

/** The house-style version of a company-admin menu built from the classic list. */
export function companyAdminHouseMenu(classic: readonly NavItemDef[]): NavItemDef[] {
  const items = classic
    .filter((i) => !COMPANY_ADMIN_HOUSE_HIDDEN_ROUTES.has(i.to))
    .map((i) => (i.to === ROUTES.COMPANY_ADMIN.USERS ? { ...i, label: "People" } : i))
  if (!items.some((i) => i.to === ROUTES.HELP)) items.push(COMPANY_ADMIN_HOUSE_HELP_ITEM)
  return items
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
