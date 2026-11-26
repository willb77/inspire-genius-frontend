import { useMemo } from "react"
import {
  getUserNavItems,
  OWNER_ONLY_NAV_ROUTES,
  isPlatformOwner,
  SUPER_ADMIN_HOUSE_FOOTER_ITEMS,
} from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import { useAgentEngine } from "@/lib/agentApi"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
import { useToolsSection } from "@/hooks/nav/useToolsSection"
import { useAuth } from "@/context/useAuth"
import { HOUSE_SUPER_ADMIN_SECTIONS } from "@/constants/house/superAdminNav"

/** RM-8 (O-1): rows the house footer now holds, dropped from My Workspace there. */
const HOUSE_FOOTER_DUPLICATES: ReadonlySet<string> = new Set([ROUTES.SETTINGS, ROUTES.HELP])

export type SuperAdminSectionsOptions = {
  /**
   * Sections placed directly before Tools — a vertical page puts the vertical's
   * own menu here (RM-9b, D-1). Empty elsewhere.
   */
  beforeTools?: NavSectionDef[]
  /**
   * Render My Workspace as an always-open plain group.
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
 * Section order: six groups plus Advanced, then Tools, then My Workspace, then
 * the pinned footer — the house-style menu. Role Views gave way to the
 * "View as…" switcher on Admin home.
 *
 * RM-9b (2026-11-26, decision D-1): this is the only super-admin menu.
 * The classic one (My Workspace → Role Views → Tools → Administration, reached
 * only by setting `house_style_admin=false` in the console — both tiers build
 * with the area on and nothing in the app turns it off) is gone, and vertical
 * pages use this too, with the vertical's menu passed in `beforeTools`.
 * CSA: docs/analysis/2026-11-26-rm-9-csa.md (monorepo).
 *
 * Owner-only nav routes (e.g. Dev Traffic Report) stay in their normal section
 * but are removed for every super-admin except the platform owner. The backend
 * independently refuses any non-owner caller; this is display only.
 */
export function useSuperAdminSections(options: SuperAdminSectionsOptions = {}): NavSectionDef[] {
  const { workspaceExpanded = false, beforeTools } = options
  const agentEngineOn = useAgentEngine()
  const { user } = useAuth()
  // My Workspace = the user menu plus the workspace verticals (Career Fit),
  // spliced in above Settings/Help — omitted when unentitled.
  const userNavItems = useWorkspaceNavItems(getUserNavItems(agentEngineOn))
  // The single consolidated Tools section — see hooks/nav/useToolsSection.
  const toolsSection = useToolsSection("super-admin")
  const isOwner = isPlatformOwner(user?.email)

  return useMemo(() => {
    const gate = (items: NavSectionDef["items"]) =>
      isOwner ? items : items.filter((i) => !OWNER_ONLY_NAV_ROUTES.has(i.to))
    // RM-8 (O-1, CSA #2223 A2): /settings and /help leave My Workspace here, so
    // the footer holds the one Settings and the one Help & Support. Both routes
    // stay open to the role; nothing else in the group moves.
    const workspace: NavSectionDef = {
      label: "My Workspace",
      items: userNavItems.filter((i) => !HOUSE_FOOTER_DUPLICATES.has(i.to)),
    }
    return [
      // RM-8 (O-1): Settings leaves Advanced for the pinned footer below.
      ...HOUSE_SUPER_ADMIN_SECTIONS.map((s) => ({
        ...s,
        items: gate(s.items).filter((i) => i.to !== ROUTES.SUPER_ADMIN.SETTINGS),
      })),
      // RM-9b (D-1): a vertical page's own menu, directly before Tools.
      ...(beforeTools ?? []),
      // ONE "Tools" section, assembled in useToolsSection. Duplicate labels
      // collide on SidebarScaffold's `key={section.label}`.
      ...(toolsSection ? [toolsSection] : []),
      // Collapsed on admin pages (wireframe); SidebarScaffold still opens it on
      // any page it holds. UserLayout and vertical pages ask for it open.
      workspaceExpanded ? workspace : { ...workspace, defaultCollapsed: true },
      { label: "", items: SUPER_ADMIN_HOUSE_FOOTER_ITEMS, pinned: true },
    ]
  }, [userNavItems, toolsSection, isOwner, workspaceExpanded, beforeTools])
}
