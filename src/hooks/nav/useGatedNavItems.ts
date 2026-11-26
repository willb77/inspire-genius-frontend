import { useMemo } from "react"
import { ClipboardCheck, PieChart } from "lucide-react"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import {
  FOOTER_NAV_ITEMS_BY_ROLE,
  MY_WORKSPACE_SECTION_LABEL,
  NAV_ITEMS_BY_ROLE,
  WORKSPACE_SECTION_ROLES,
  getWorkspaceSectionItems,
} from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { useWorkspaceNavItems, withWorkspaceVerticals } from "@/components/layout/useVerticalLauncher"
import { useExamAccess } from "@/hooks/super-admin/usePrismExam"
import { useCohortReadoutEnabled } from "@/hooks/company-admin/useCohortReadout"
import { companyAdminHouseMenu } from "@/constants/house/companyAdminNav"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
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

/** N-3: the company-admin's cohort read-out, present only when the org's switch is on. */
const COHORT_READOUT_NAV_ITEM: NavItemDef = {
  to: ROUTES.COMPANY_ADMIN.COHORT_READOUT,
  icon: PieChart,
  label: "Cohort Read-out",
}

/**
 * A role's own menu — its `NAV_ITEMS_BY_ROLE` list, plus PRISM Exam and Cohort
 * Read-out when granted or switched on.
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
 * Cohort Read-out (N-3) follows the same rule for a company-admin: the status
 * read runs for that role only, and the item appears only on `true` — with the
 * `cohort_readout` switch off (no row), the menu is exactly as before. With the
 * company-admin house switch on it is not a row at all: it is the Cohort
 * Read-out tab of the Analytics hub, under the same org switch (RM-5).
 */
export function useGatedNavItems(role: UserRole): NavItemDef[] {
  return useOwnWorkItems(role, null)
}

/**
 * The own-work list, with `talentStudio` (RM-4: the manager's and practitioner's
 * Talent Studio group) placed after the role's own rows and before PRISM Exam
 * and Cohort Read-out.
 */
function useOwnWorkItems(role: UserRole, talentStudio: NavItemDef | null): NavItemDef[] {
  const examAccess = useExamAccess(EXAM_GRANTABLE_ROLES.has(role))
  const cohort = useCohortReadoutEnabled(role === "company-admin")
  const granted = !!examAccess.data?.allowed && !examAccess.data?.super_admin
  // House style (area `company-admin`, default OFF): display-only menu swap.
  const roleBase = NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user
  const houseOn = role === "company-admin" && isHouseStyleOn("company-admin")
  // RM-5: with house style on, Cohort Read-out is a tab of the Analytics hub
  // (shown there under the same switch), so it is not also a menu row. With
  // house style off, the row is exactly as before.
  const cohortOn = role === "company-admin" && cohort.data === true && !houseOn
  const base = useMemo(() => (houseOn ? companyAdminHouseMenu(roleBase) : roleBase), [houseOn, roleBase])
  const items = useMemo(() => {
    const withTalent = talentStudio ? [...base, talentStudio] : base
    const extra: NavItemDef[] = []
    if (granted) extra.push(EXAM_NAV_ITEM)
    if (cohortOn) extra.push(COHORT_READOUT_NAV_ITEM)
    return extra.length ? withWorkspaceVerticals(withTalent, extra) : withTalent
  }, [base, talentStudio, granted, cohortOn])
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
  sections.push({ label: "", items: frame.footer })
  return sections
}

export default useGatedNavItems
