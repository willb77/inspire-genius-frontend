import { useMemo } from "react"
import { Wallet, BookOpen } from "lucide-react"
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
 * A role's own menu — exactly its `NAV_ITEMS_BY_ROLE` list. Entitlement-gated
 * verticals are NOT mixed in here; they render separately (see
 * {@link useEntitledVerticalItems}) under a collapsed "Verticals" section, so a
 * role's own items stay prominent.
 */
export function useGatedNavItems(role: UserRole): NavItemDef[] {
  return NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user
}

/**
 * One nav entry per vertical the signed-in user is entitled to (Financial Aid,
 * Knowledge Continuity, any launcher vertical like Honor, and — for allow-listed
 * super-admins — Platform Alerts). `UnifiedLayout` renders these under a
 * COLLAPSED "Verticals" section so they stay one click away without cluttering
 * the role menu. Empty when the user has no entitled verticals.
 *
 * Each vertical is a single entry-point link (its own detailed sub-nav appears
 * inside its shell once entered) — we deliberately do NOT flatten GRANT's nine
 * aid pages into the sidebar.
 */
export function useEntitledVerticalItems(role: UserRole): NavItemDef[] {
  const { hasAccess: hasGrantAccess } = useVerticalAccess("grant")
  const { hasAccess: hasKceAccess } = useVerticalAccess("knowledge-continuity")
  const launcherSection = useVerticalLauncherSection()
  const { data: broadcastAccess } = useBroadcastAccess()

  return useMemo(() => {
    const items: NavItemDef[] = []
    if (hasGrantAccess) {
      const grant = grantSidebarSectionForRole(role)
      items.push({ to: grant.items[0]?.to ?? "/vertical/grant", icon: Wallet, label: "Financial Aid" })
    }
    if (hasKceAccess) {
      items.push({
        to: KCE_SIDEBAR_SECTION.items[0]?.to ?? "/vertical/knowledge-continuity",
        icon: BookOpen,
        label: "Knowledge Continuity",
      })
    }
    if (launcherSection) items.push(...launcherSection.items)
    if (broadcastAccess?.authorized) items.push(...BROADCAST_SIDEBAR_SECTION.items)
    return items
  }, [role, hasGrantAccess, hasKceAccess, launcherSection, broadcastAccess])
}

export default useGatedNavItems
