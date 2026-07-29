import { useMemo } from "react"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import { BROADCAST_SIDEBAR_SECTION } from "@/constants/sidebar-sections"
import {
  useVerticalLauncherSection,
  useWorkspaceNavItems,
} from "@/components/layout/useVerticalLauncher"
import { useBroadcastAccess } from "@/hooks/super-admin/useBroadcast"

/**
 * A role's own menu — its `NAV_ITEMS_BY_ROLE` list, plus the **workspace**
 * verticals (Job Fit, Lumen), which read as everyday first-person tools rather
 * than separate products and so belong in My Workspace. Every OTHER vertical is
 * NOT mixed in here; those render separately (see {@link useEntitledVerticalItems})
 * under a "Verticals" section, so a role's own items stay prominent.
 */
export function useGatedNavItems(role: UserRole): NavItemDef[] {
  return useWorkspaceNavItems(NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user)
}

/**
 * The Verticals section's items: **every** registered vertical (Financial Aid,
 * Knowledge Continuity, Honor, …) plus — for allow-listed super-admins —
 * Platform Alerts.
 *
 * Visibility is no longer gated (2026-07-28): the whole catalogue is listed for
 * every user, and a vertical the user has no entitlement for arrives already
 * marked `disabled`, so it renders greyed and non-navigating. Entitlement
 * decides what you can *use*, not what you can *see*.
 *
 * Each vertical is a single entry-point link — its detailed sub-nav appears
 * inside its own shell once entered, so GRANT's nine aid pages are deliberately
 * NOT flattened into the sidebar.
 */
export function useEntitledVerticalItems(role: UserRole): NavItemDef[] {
  const launcherSection = useVerticalLauncherSection()
  const { data: broadcastAccess } = useBroadcastAccess()

  return useMemo(() => {
    void role // the catalogue is role-independent; entitlement is the only gate
    const items: NavItemDef[] = launcherSection ? [...launcherSection.items] : []
    // Platform Alerts is access-gated (DB allowlist), not a vertical — it stays
    // hidden rather than greyed, because a non-allowlisted super-admin has no
    // "upgrade" path to advertise.
    if (broadcastAccess?.authorized) items.push(...BROADCAST_SIDEBAR_SECTION.items)
    return items
  }, [role, launcherSection, broadcastAccess])
}

export default useGatedNavItems
