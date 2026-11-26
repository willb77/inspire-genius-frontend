import { useMemo } from "react"
import {
  SUPER_ADMIN_NAV_SECTIONS,
  getUserNavItems,
  OWNER_ONLY_NAV_ROUTES,
  isPlatformOwner,
} from "@/constants/navigation"
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import { useAgentEngine } from "@/lib/agentApi"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
import { useToolsSection } from "@/hooks/nav/useToolsSection"
import { useAuth } from "@/context/useAuth"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import { HOUSE_SUPER_ADMIN_SECTIONS } from "@/constants/house/superAdminNav"
import { groupAdministrationItems } from "@/constants/house/administrationCategories"
import { useSavedJobsEnabled } from "@/hooks/job-fit/useSavedJobs"

export type SuperAdminSectionsOptions = {
  /**
   * Render My Workspace as an always-open plain group, even under house style.
   * UserLayout pages (/home, Help, Documents…) pass true: there the workspace
   * IS the page, and "My Workspace" stays always visible for super-admins
   * (decision of 2026-10-12). Admin pages leave it false, and house style keeps
   * the group collapsed there, as before.
   */
  workspaceExpanded?: boolean
}

/**
 * The super-admin sidebar, built once for every layout that shows it
 * (SuperAdminLayout and UserLayout's super-admin branch), so a super-admin
 * sees one menu whether they are on Home or on an admin page (RM-2).
 *
 * Section order (2026-07-28): **My Workspace → Role Views → Tools →
 * Administration** in the classic menu. House style (area `admin`) shows six
 * groups plus Advanced, then Tools, then My Workspace; Role Views gives way to
 * the "View as…" switcher on Admin home, which renders under the same switch,
 * so no role home is ever left without a link.
 *
 * Owner-only nav routes (e.g. Dev Traffic Report) stay in their normal section
 * but are removed for every super-admin except the platform owner. The backend
 * independently refuses any non-owner caller; this is display only.
 */
export function useSuperAdminSections(options: SuperAdminSectionsOptions = {}): NavSectionDef[] {
  const { workspaceExpanded = false } = options
  const agentEngineOn = useAgentEngine()
  const { user } = useAuth()
  // My Workspace = the user menu plus the workspace verticals (Career Fit),
  // spliced in above Settings/Help — omitted when unentitled.
  const userNavItems = useWorkspaceNavItems(getUserNavItems(agentEngineOn))
  // The single consolidated Tools section — see hooks/nav/useToolsSection.
  const toolsSection = useToolsSection("super-admin")
  const isOwner = isPlatformOwner(user?.email)
  // A plain function, not a hook: localStorage first, then the build list.
  const houseStyle = isHouseStyleOn("admin")
  // JF-13 admin: `job_fit_v2` shows Administration in the house categories.
  // Only a server `true` is on; loading, an error and false keep today's list.
  const jobFitV2 = useSavedJobsEnabled()

  return useMemo(() => {
    const gate = (items: NavSectionDef["items"]) =>
      isOwner ? items : items.filter((i) => !OWNER_ONLY_NAV_ROUTES.has(i.to))
    const bySection = (label: string) =>
      SUPER_ADMIN_NAV_SECTIONS.filter((s) => s.label === label).map((s) => ({
        ...s,
        items: gate(s.items),
      }))
    // Always visible: a plain group, no header toggle (2026-10-12).
    const openWorkspace: NavSectionDef = { label: "My Workspace", items: userNavItems }
    if (houseStyle) {
      return [
        ...HOUSE_SUPER_ADMIN_SECTIONS.map((s) => ({ ...s, items: gate(s.items) })),
        ...(toolsSection ? [toolsSection] : []),
        // Collapsed on admin pages (wireframe); SidebarScaffold still opens it
        // on any page it holds. UserLayout pages ask for it open.
        workspaceExpanded ? openWorkspace : { ...openWorkspace, defaultCollapsed: true },
      ]
    }
    return [
      openWorkspace,
      ...bySection("Role Views"),
      // ONE "Tools" section, assembled in useToolsSection. Duplicate labels
      // collide on SidebarScaffold's `key={section.label}`.
      ...(toolsSection ? [toolsSection] : []),
      // Administration keeps its closed default (2026-10-12). It still opens on
      // any admin page, because SidebarScaffold opens the group holding the page.
      // With job_fit_v2 on, the same (owner-gated) entries in categories.
      ...bySection("Administration").map((s) =>
        jobFitV2 ? { ...s, items: groupAdministrationItems(s.items) } : s,
      ),
    ]
  }, [userNavItems, toolsSection, isOwner, houseStyle, jobFitV2, workspaceExpanded])
}
