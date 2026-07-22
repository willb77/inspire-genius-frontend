import { useMemo } from "react"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import {
  grantSidebarSectionForRole,
  KCE_SIDEBAR_SECTION,
  BROADCAST_SIDEBAR_SECTION,
} from "@/constants/sidebar-sections"
import { useVerticalAccess } from "@/verticals/core"
import { useVerticalLauncherSection } from "@/components/layout/useVerticalLauncher"
import { useBroadcastAccess } from "@/hooks/super-admin/useBroadcast"

/**
 * Resolves the sidebar nav items for a role, appending entitlement/access-gated
 * items after the role's base items — mirroring the gating that used to live in
 * the legacy `AppSidebar` (grant vertical, Knowledge-Continuity, the generalized
 * vertical launcher, and super-admin broadcast).
 *
 * Consumed by `UnifiedLayout` so every role rendered through the standard
 * `SidebarScaffold` chrome keeps the same entitlement behavior the old shell
 * had. `SidebarNavItem` extends `NavItemDef`, so the appended items drop in
 * without conversion.
 */
export function useGatedNavItems(role: UserRole): NavItemDef[] {
  const base = NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user
  const { hasAccess: hasGrantAccess } = useVerticalAccess("grant")
  const { hasAccess: hasKceAccess } = useVerticalAccess("knowledge-continuity")
  const launcherSection = useVerticalLauncherSection()
  const { data: broadcastAccess } = useBroadcastAccess()

  return useMemo(() => {
    const extra: NavItemDef[] = []
    if (hasGrantAccess) extra.push(...grantSidebarSectionForRole(role).items)
    if (hasKceAccess) extra.push(...KCE_SIDEBAR_SECTION.items)
    if (launcherSection) extra.push(...launcherSection.items)
    if (broadcastAccess?.authorized) extra.push(...BROADCAST_SIDEBAR_SECTION.items)
    return [...base, ...extra]
  }, [base, role, hasGrantAccess, hasKceAccess, launcherSection, broadcastAccess])
}

export default useGatedNavItems
