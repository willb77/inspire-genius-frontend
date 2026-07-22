import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"

/**
 * Resolves the sidebar nav items for a role rendered through the standard
 * `SidebarScaffold` chrome (via `UnifiedLayout`).
 *
 * Each role's menu is EXACTLY its `NAV_ITEMS_BY_ROLE` list — entitlement-gated
 * verticals (GRANT / Knowledge-Continuity / the vertical launcher / broadcast)
 * are intentionally NOT appended here. The practitioner menu, for example,
 * shows only its five items regardless of which verticals the signed-in user
 * (e.g. the platform owner) happens to have enabled. Verticals remain reachable
 * by their own routes / launchers, just not injected into a role's menu.
 *
 * This stays a hook so it remains the single extension point if a future role
 * needs conditional items composed in.
 */
export function useGatedNavItems(role: UserRole): NavItemDef[] {
  return NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user
}

export default useGatedNavItems
