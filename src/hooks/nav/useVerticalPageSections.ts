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
import { withCompanyAdminHouseMenu } from "@/constants/house/companyAdminNav"
import { jobFitToolsFor, verticalSubNavItems } from "@/constants/vertical-subnav"
import { useSavedJobsEnabled } from "@/hooks/job-fit/useSavedJobs"
import { useAgentEngine } from "@/lib/agentApi"
import { useAuth } from "@/context/useAuth"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
import { useToolsSection } from "@/hooks/nav/useToolsSection"
import { groupAdministrationItems } from "@/constants/house/administrationCategories"
import { getVertical, type VerticalKey } from "@/verticals/core"
import { discoveryMenu } from "@/lib/career-discovery/profileSection"
import { useProfileMerged } from "@/hooks/career-discovery/useProfileMerged"

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
    ? getUserNavItems(agentEngineOn)
    : withCompanyAdminHouseMenu(role, NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user)
  const workspaceItems = useWorkspaceNavItems(baseItems)

  const toolsSection = useToolsSection(role)
  // JF-11: Career Discovery shows About me + Who I am as one entry when the
  // server says so (read from the cache only; false everywhere else).
  const discoveryMerged = useProfileMerged()
  // JF-8: Job Fit's section is the same list as its pill row (FitNav) — with
  // `job_fit_v2` on, "Careers and Jobs" replaces "My fit" and "Growth areas".
  // Off (loading, error, false) the section is `verticalSubNavItems`, untouched.
  const jobFitV2 = useSavedJobsEnabled()
  const subNav = useMemo(() => {
    const raw = verticalSubNavItems(vertical, role)
    if (vertical === "job-fit" && raw && jobFitV2) {
      return { ...raw, items: jobFitToolsFor(role, true) }
    }
    return vertical === "career-discovery" && raw && discoveryMerged
      ? { ...raw, items: discoveryMenu(raw.items, true) }
      : raw
  }, [vertical, role, discoveryMerged, jobFitV2])
  const definition = getVertical(vertical)

  return useMemo(() => {
    const sections: NavSectionDef[] = [
      // Always visible: a plain group, no header toggle (Bill, 2026-10-12).
      { label: "My Workspace", items: workspaceItems },
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

    // The consolidated Tools section — super-admin only as of 2026-08-12, so a
    // manager inside a vertical now sees My Workspace + that vertical's own
    // sub-nav and nothing more. Its own `defaultCollapsed` is honoured rather
    // than forced here: the section must not expand and collapse as you move
    // between vertical pages and the rest of the app.
    if (toolsSection) {
      sections.push({
        ...toolsSection,
        // Mark the vertical you are in as active for every page under it, not
        // just its home page.
        items: toolsSection.items.map((item) =>
          item.to.startsWith(`/vertical/${vertical}`)
            ? { ...item, activePrefix: `/vertical/${vertical}` }
            : item,
        ),
      })
    }

    // JF-13 admin: with job_fit_v2 on, the same (owner-gated) entries in the
    // house categories. Off (loading, error, false) the list is today's.
    sections.push(
      ...adminSection("Administration").map((s) =>
        jobFitV2 ? { ...s, items: groupAdministrationItems(s.items) } : s,
      ),
    )
    return sections
  }, [workspaceItems, toolsSection, subNav, definition, vertical, isSuperAdmin, isOwner, jobFitV2])
}

export default useVerticalPageSections
