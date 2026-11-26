import { useMemo } from "react"
import { ClipboardCheck } from "lucide-react"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import {
  FOOTER_NAV_ITEMS_BY_ROLE,
  MY_WORKSPACE_SECTION_LABEL,
  WORKSPACE_SECTION_ROLES,
  roleNavItems,
  getWorkspaceSectionItems,
  practitionerFrontPageMenu,
} from "@/constants/navigation"
import { usePractitionerClientRosterEnabled } from "@/hooks/switches/usePractitionerClientRosterEnabled"
import { ROUTES } from "@/constants/routes"
import { useWorkspaceNavItems, withWorkspaceVerticals } from "@/components/layout/useVerticalLauncher"
import { useExamAccess } from "@/hooks/super-admin/usePrismExam"
import { useAgentEngine } from "@/lib/agentApi"
import { useToolsParts } from "@/hooks/nav/useToolsSection"

/** Roles a super-admin can grant exam access to — the server's rank gate (manager or above). */
const EXAM_GRANTABLE_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  "manager",
  "company-admin",
  "practitioner",
  "distributor",
])

/** Label must stay unique: SidebarScaffold keys nav items by label ("PRISM Practitioner Exam" is super-admin's). */
const EXAM_NAV_ITEM: NavItemDef = { to: ROUTES.PRISM_EXAM, icon: ClipboardCheck, label: "PRISM Exam" }

/**
 * A role's own menu — its `NAV_ITEMS_BY_ROLE` list, plus PRISM Exam when
 * granted.
 *
 * For a role WITHOUT a My Workspace section (user, distributor, super-admin)
 * the workspace verticals (Career & Education Discovery, Career Fit, Direction
 * Setting) are spliced into this list too, as before RM-4. For manager,
 * company admin and practitioner they are in the My Workspace section instead
 * ({@link useRoleMenuFrame}), so they are not spliced here — each appears once.
 *
 * PRISM Exam (2026-10-27) is added only for an account the server says has a
 * grant; the access read is skipped for a plain `user`, who can never have one.
 * Absent while loading or on any error, so the menu never offers a page that
 * would only say "no access".
 *
 * Cohort Read-out (N-3) is not a menu row: it is the Cohort Read-out tab of the
 * company-admin Analytics hub, under its org switch (RM-5). The classic
 * (house-off) menu that carried it as a row was removed with the company-admin
 * transform in RM-9a (CSA docs/analysis/2026-11-26-rm-9-csa.md, monorepo).
 */
export function useGatedNavItems(role: UserRole): NavItemDef[] {
  return useOwnWorkItems(role, null)
}

/**
 * The own-work list, with `talentStudio` (RM-4: the manager's and practitioner's
 * Talent Studio group) placed after the role's own rows and before PRISM Exam.
 */
function useOwnWorkItems(role: UserRole, talentStudio: NavItemDef | null): NavItemDef[] {
  const examAccess = useExamAccess(EXAM_GRANTABLE_ROLES.has(role))
  const granted = !!examAccess.data?.allowed && !examAccess.data?.super_admin
  // RM-9b (D-2): the user role's list is the toggle-aware one Home shows.
  const agentEngineOn = useAgentEngine()
  const roleBase = useMemo(() => roleNavItems(role, agentEngineOn), [role, agentEngineOn])
  // RM-6 B: where the Studio lists the practitioner's clients, Practitioner Home
  // and My Clients leave the menu (both open from the Studio header). Off, a
  // 404 or an error: the practitioner's rows are exactly as before.
  const studioIsFrontPage = usePractitionerClientRosterEnabled(role === "practitioner")
  const folded = role === "practitioner" && studioIsFrontPage
  const base = useMemo(
    () => (folded ? practitionerFrontPageMenu(roleBase) : roleBase),
    [folded, roleBase],
  )
  const items = useMemo(() => {
    const withTalent = talentStudio ? [...base, talentStudio] : base
    const extra: NavItemDef[] = []
    if (granted) extra.push(EXAM_NAV_ITEM)
    return extra.length ? withWorkspaceVerticals(withTalent, extra) : withTalent
  }, [base, talentStudio, granted])
  // Called for every role so the hook order never depends on the role.
  const spliced = useWorkspaceNavItems(items)
  return WORKSPACE_SECTION_ROLES.has(role) ? items : spliced
}

/**
 * RM-4 — the parts of a role's menu. `footer` is null for a role the frame does
 * not cover (user, super-admin); `workspace` is null for a role with no My
 * Workspace section (distributor, user, super-admin).
 */
export type RoleMenuFrame = {
  own: NavItemDef[]
  workspace: NavItemDef[] | null
  tools: NavSectionDef | null
  footer: NavItemDef[] | null
}

/**
 * RM-4 (2026-11-25) — the shared menu frame for manager, company admin,
 * practitioner and distributor: the role's own work, My Workspace, Tools and a
 * Settings / Help & Support footer.
 *
 * - **Own work** — {@link useGatedNavItems}'s list, with Talent Studio (manager
 *   and practitioner, `job_fit_v2` on) after the role's rows.
 * - **My Workspace** — manager, company admin and practitioner only (RM-D3: not
 *   the distributor). The user menu less Home, Settings and Help, in the owner's
 *   2026-10-29 order, with entitled career verticals spliced in front of Role
 *   Play. Rendered as a VISIBLE plain group (owner decision, 2026-10-12: "Keep the My
 *   Workspace menu visible").
 * - **Tools** — as before, less Talent Studio and Goals Studio.
 * - **Footer** — Settings and Help & Support (RM-D2).
 */
export function useRoleMenuFrame(role: UserRole): RoleMenuFrame {
  const { section: tools, talentStudio } = useToolsParts(role)
  const own = useOwnWorkItems(role, talentStudio)
  // Always the Meridian chat row (/meridian/chat, autoLoadPrism), whatever the
  // legacy `agent_engine_enabled` browser toggle says: it is the practitioner's
  // row today, unconditionally, and RM-4 moves it without changing it. The
  // toggle still switches the user's and super-admin's menus, as before.
  const workspaceBase = useMemo(() => getWorkspaceSectionItems(true), [])
  const workspace = useWorkspaceNavItems(workspaceBase)
  return useMemo(
    () => ({
      own,
      workspace: WORKSPACE_SECTION_ROLES.has(role) ? workspace : null,
      tools,
      footer: FOOTER_NAV_ITEMS_BY_ROLE[role] ?? null,
    }),
    [role, own, workspace, tools],
  )
}

/**
 * The frame as sidebar sections, in order: own work, My Workspace, any
 * `middle` sections (a vertical page puts the vertical's own menu here), Tools,
 * footer. Returns null for a role the frame does not cover, so the caller keeps
 * its existing menu for user and super-admin.
 */
export function frameSections(frame: RoleMenuFrame, middle: NavSectionDef[] = []): NavSectionDef[] | null {
  if (!frame.footer) return null
  const sections: NavSectionDef[] = [{ label: "", items: frame.own }]
  if (frame.workspace) sections.push({ label: MY_WORKSPACE_SECTION_LABEL, items: frame.workspace })
  sections.push(...middle)
  if (frame.tools) sections.push(frame.tools)
  // RM-8 (O-RM4W-a): pinned, so Settings and Help & Support stay in view
  // above Logout instead of sitting below the fold of a long menu.
  sections.push({ label: "", items: frame.footer, pinned: true })
  return sections
}

export default useGatedNavItems
