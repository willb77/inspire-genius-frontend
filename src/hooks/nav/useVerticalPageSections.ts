import { useMemo } from "react"
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { roleNavItems } from "@/constants/navigation"
import { CAREERS_AND_JOBS_LABEL, jobFitToolsFor, verticalSubNavItems } from "@/constants/vertical-subnav"
import { useSavedJobsEnabled } from "@/hooks/job-fit/useSavedJobs"
import { useAgentEngine } from "@/lib/agentApi"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
import { frameSections, useRoleMenuFrame } from "@/hooks/nav/useGatedNavItems"
import { useSuperAdminSections } from "@/hooks/nav/useSuperAdminSections"
import { TOOLS_SECTION_LABEL } from "@/hooks/nav/useToolsSection"
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
 * only expanded section. By role:
 *
 *   manager, company admin, practitioner, distributor (RM-4 frame):
 *     own work · My Workspace · {Vertical} · Tools · footer
 *   super-admin (RM-9b, D-1): the house super-admin menu —
 *     six groups + Advanced · {Vertical} · Tools · My Workspace (open) · footer
 *   user (and a role outside the six):
 *     My Workspace (the same list as Home, RM-9b D-2) · {Vertical} · Tools
 *
 * The vertical's own section is omitted when Core has no menu for it, rather
 * than rendering an empty box; the launcher entry still marks where you are.
 */
export function useVerticalPageSections(
  vertical: VerticalKey,
  role: UserRole,
): NavSectionDef[] {
  const agentEngineOn = useAgentEngine()
  const isSuperAdmin = role === "super-admin"

  // My Workspace for a role outside the RM-4 frame (the user, or a role string
  // outside the six): the role's own menu through roleNavItems — for the user,
  // the same toggle-aware list as Home (RM-9b, D-2). Workspace verticals splice
  // in. (A super-admin's My Workspace comes from useSuperAdminSections.)
  const baseItems = useMemo(() => roleNavItems(role, agentEngineOn), [role, agentEngineOn])
  const workspaceItems = useWorkspaceNavItems(baseItems)

  // RM-4: manager, company admin, practitioner and distributor get the same
  // frame here as on every other page (own work, My Workspace, Tools, footer),
  // with this vertical's own menu between My Workspace and Tools.
  const frame = useRoleMenuFrame(role)
  const toolsSection = frame.tools
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

  // The vertical's own menu, opened on arrival.
  const middle: NavSectionDef[] = useMemo(
    () =>
      subNav?.items.length
        ? [
            {
              // Phase A (Careers/Education merge CSA): with `job_fit_v2` on, the menu entry
              // is already "Careers and Jobs" (useVerticalLauncher); the section it opens
              // must carry the same name, not the manifest's "Career Fit". Off (loading,
              // error, false) this is `definition.title`, exactly as before.
              label:
                subNav.label ??
                (vertical === "job-fit" && jobFitV2 ? CAREERS_AND_JOBS_LABEL : definition?.title) ??
                "This vertical",
              items: subNav.items,
              collapsible: true,
            },
          ]
        : [],
    [subNav, vertical, jobFitV2, definition],
  )

  // RM-9b (decision D-1, 2026-11-26): a super-admin gets the menu they see on every
  // other page — the house super-admin menu — with this vertical's menu directly
  // before Tools and My Workspace open (it is the workspace's page). Called for
  // every role so the hook order never depends on it; it adds no request (its
  // reads are the same queries the frame above already makes).
  const superAdminSections = useSuperAdminSections({ workspaceExpanded: true, beforeTools: middle })

  return useMemo(() => {
    // Mark the vertical you are in as active for every page under it, not just
    // its home page.
    const markActive = (section: NavSectionDef): NavSectionDef => ({
      ...section,
      items: section.items.map((item) =>
        item.to.startsWith(`/vertical/${vertical}`) ? { ...item, activePrefix: `/vertical/${vertical}` } : item,
      ),
    })

    if (isSuperAdmin) {
      return superAdminSections.map((s) => (s.label === TOOLS_SECTION_LABEL ? markActive(s) : s))
    }

    const framed = frameSections({ ...frame, tools: frame.tools ? markActive(frame.tools) : null }, middle)
    if (framed) return framed

    // The user (and any role outside the six): My Workspace, the vertical's
    // menu, then Tools when the role has one.
    const sections: NavSectionDef[] = [
      // Always visible: a plain group, no header toggle (Bill, 2026-10-12).
      { label: "My Workspace", items: workspaceItems },
      ...middle,
    ]
    if (toolsSection) sections.push(markActive(toolsSection))
    return sections
  }, [workspaceItems, frame, toolsSection, middle, vertical, isSuperAdmin, superAdminSections])
}

export default useVerticalPageSections
