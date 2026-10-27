import { useMemo } from "react"
import { ClipboardCheck } from "lucide-react"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { useWorkspaceNavItems, withWorkspaceVerticals } from "@/components/layout/useVerticalLauncher"
import { useExamAccess } from "@/hooks/super-admin/usePrismExam"

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
 * A role's own menu — its `NAV_ITEMS_BY_ROLE` list, plus the **workspace**
 * verticals (Job Fit, Lumen) and workspace deep links (Resume Writer), which
 * read as everyday first-person tools rather than separate products and so
 * belong in My Workspace.
 *
 * Every OTHER vertical is NOT mixed in here. Those live in the consolidated
 * "Tools" section — see `useToolsSection`, which as of 2026-08-12 builds it for
 * super-admins only. `useEntitledVerticalItems` used to live in this file and
 * assembled that catalogue for UnifiedLayout's separate "Verticals" section; it
 * was removed with that section, since the one hook now owns the list.
 *
 * PRISM Exam (2026-10-27) is added only for an account the server says has a
 * grant; the access read is skipped for a plain `user`, who can never have one.
 * Absent while loading or on any error, so the menu never offers a page that
 * would only say "no access".
 */
export function useGatedNavItems(role: UserRole): NavItemDef[] {
  const examAccess = useExamAccess(EXAM_GRANTABLE_ROLES.has(role))
  const granted = !!examAccess.data?.allowed && !examAccess.data?.super_admin
  const base = NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user
  const items = useMemo(() => (granted ? withWorkspaceVerticals(base, [EXAM_NAV_ITEM]) : base), [base, granted])
  return useWorkspaceNavItems(items)
}

export default useGatedNavItems
