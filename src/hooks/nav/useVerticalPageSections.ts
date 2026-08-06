import { useMemo } from "react"
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import {
  NAV_ITEMS_BY_ROLE,
  SUPER_ADMIN_NAV_SECTIONS,
  getUserNavItems,
  OWNER_ONLY_NAV_ROUTES,
  isPlatformOwner,
} from "@/constants/navigation"
import { verticalSubNavItems } from "@/constants/vertical-subnav"
import { useAgentEngine } from "@/lib/agentApi"
import { useAuth } from "@/context/useAuth"
import {
  useVerticalLauncherSection,
  useWorkspaceNavItems,
} from "@/components/layout/useVerticalLauncher"
import { getVertical, type VerticalKey } from "@/verticals/core"

/**
 * The left-rail sections for a page **inside** a vertical.
 *
 * Entering a vertical used to replace the whole menu with the role list plus,
 * for GRANT/KCE only, that vertical's pages — so the rest of the app vanished
 * and three verticals showed no menu at all. This keeps the full app menu
 * present but out of the way, and gives the vertical you actually opened the
 * only expanded section:
 *
 *   My Workspace          — header only, rolled up until clicked
 *   Role Views            — rolled up            (super-admin only)
 *   {Vertical} → OPEN     — the vertical you just entered, collapsible
 *   Verticals             — rolled up, the whole catalogue
 *   Administration        — rolled up, last      (super-admin only)
 *
 * The vertical's own section is omitted when Core has no menu for it, rather
 * than rendering an empty box; the launcher entry still marks where you are.
 */
export function useVerticalPageSections(
  vertical: VerticalKey,
  role: UserRole,
): NavSectionDef[] {
  const agentEngineOn = useAgentEngine()
  const { user } = useAuth()
  const isSuperAdmin = role === "super-admin"
  const isOwner = isPlatformOwner(user?.email)

  // My Workspace: the user surface for a super-admin (matching SuperAdminLayout,
  // where "My Workspace" means the user experience, not the admin tools);
  // otherwise the role's own menu. Workspace verticals splice in either way.
  const baseItems = isSuperAdmin
    ? getUserNavItems(agentEngineOn, { viewerEmail: user?.email })
    : NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user
  const workspaceItems = useWorkspaceNavItems(baseItems)

  const launcherSection = useVerticalLauncherSection()
  const subNav = verticalSubNavItems(vertical, role)
  const definition = getVertical(vertical)

  return useMemo(() => {
    const sections: NavSectionDef[] = [
      { label: "My Workspace", items: workspaceItems, defaultCollapsed: true },
    ]

    const gate = (items: NavSectionDef["items"]) =>
      isOwner ? items : items.filter((i) => !OWNER_ONLY_NAV_ROUTES.has(i.to))
    const adminSection = (label: string) =>
      isSuperAdmin
        ? SUPER_ADMIN_NAV_SECTIONS.filter((s) => s.label === label).map((s) => ({
            ...s,
            items: gate(s.items),
            defaultCollapsed: true,
          }))
        : []

    sections.push(...adminSection("Role Views"))

    // The point of the whole hook: the vertical you clicked into opens.
    if (subNav?.items.length) {
      sections.push({
        label: subNav.label ?? definition?.title ?? "This vertical",
        items: subNav.items,
        collapsible: true,
      })
    }

    if (launcherSection) {
      sections.push({
        label: launcherSection.label,
        // Mark the vertical you are in as active for every page under it, not
        // just its home page.
        items: launcherSection.items.map((item) =>
          item.to.startsWith(`/vertical/${vertical}`)
            ? { ...item, activePrefix: `/vertical/${vertical}` }
            : item,
        ),
        defaultCollapsed: true,
      })
    }

    sections.push(...adminSection("Administration"))
    return sections
  }, [workspaceItems, launcherSection, subNav, definition, vertical, isSuperAdmin, isOwner])
}

export default useVerticalPageSections
