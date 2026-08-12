import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"

/**
 * A role's own menu — its `NAV_ITEMS_BY_ROLE` list, plus the **workspace**
 * verticals (Job Fit, Lumen) and workspace deep links (Resume Writer), which
 * read as everyday first-person tools rather than separate products and so
 * belong in My Workspace.
 *
 * Every OTHER vertical is NOT mixed in here. Those live in the consolidated
 * "Tools" section — see `useToolsSection`, which as of 2026-08-12 builds it for
 * super-admins only. `useEntitledVerticalItems` used to live in this file and
 * assembled that catalogue for UnifiedLayout's separate "Verticals" section; it
 * was removed with that section, since the one hook now owns the list.
 */
export function useGatedNavItems(role: UserRole): NavItemDef[] {
  return useWorkspaceNavItems(NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user)
}

export default useGatedNavItems
