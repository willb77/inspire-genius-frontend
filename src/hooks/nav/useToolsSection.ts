import { useMemo } from "react"
import { BookOpenText } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { TOOL_ITEMS_BY_ROLE } from "@/constants/navigation"
import { BROADCAST_SIDEBAR_SECTION } from "@/constants/sidebar-sections"
import { useVerticalLauncherSection } from "@/components/layout/useVerticalLauncher"
import { useBroadcastAccess } from "@/hooks/super-admin/useBroadcast"

/**
 * The ONE "Tools" section — super-admin only (2026-08-12, request).
 *
 * ## What this replaces
 *
 * Tool and vertical entries used to be assembled independently in four places,
 * and two of them rendered *two* groups each:
 *
 *   - `UnifiedLayout`          → "Tools" (TOOL_ITEMS_BY_ROLE) + "Verticals"
 *   - `UserLayout`             → launcher section (labelled "Tools") + Bio Capture
 *   - `SuperAdminLayout`       → launcher items + SUPER_ADMIN_TOOLS_SECTION
 *   - `useVerticalPageSections`→ launcher section (labelled "Tools")
 *
 * Two sections carrying the SAME label was not cosmetic. `SidebarScaffold` keys
 * sections by `key={section.label}`, so duplicate labels collided during
 * reconciliation and the second group only surfaced when a neighbouring section
 * was toggled — which is why Tools appeared to hide behind Administration.
 * Assembling the list once, here, is what makes that class of bug impossible
 * rather than merely fixed in the one layout that got patched.
 *
 * ## Order
 *
 * Bio Capture → the role's tool items → the vertical catalogue → Platform
 * Alerts. Utility surfaces first because they are things you *do*; the vertical
 * catalogue is a place you *browse*.
 *
 * ## Entitlement
 *
 * Vertical entries arrive from the launcher already marked `disabled` when the
 * user has no entitlement, and they stay that way for super-admins too.
 * `useVerticalAccess` grants super-admin no bypass — access is the server
 * entitlement list — so un-greying here would produce links that render, invite
 * a click, and then bounce to /home via `VerticalShell`. A greyed entry that
 * explains itself beats a live link that lies.
 */

/** The single label. Exported so tests and layouts cannot drift from it. */
export const TOOLS_SECTION_LABEL = "Tools"

/**
 * Roles that see the Tools section. Super-admin only as of 2026-08-12.
 *
 * A set rather than an inline `role === "super-admin"` so the gate is greppable
 * and widening it later is a one-line edit in one file — the previous
 * arrangement required touching four layouts to change who saw what.
 */
export const TOOLS_SECTION_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  "super-admin",
  // 2026-08-31 (request): give managers and practitioners their tools back.
  //
  // This is the "one-line edit" the note above anticipated. Both roles already
  // had entries in TOOL_ITEMS_BY_ROLE — kept deliberately when the section was
  // narrowed to super-admin on 2026-08-12 — so until now those entries were
  // correct data that rendered nowhere. Adding items to TOOL_ITEMS_BY_ROLE
  // without widening this set is the trap: the nav constant reads right, its
  // tests pass, and the sidebar shows nothing.
  "manager",
  "practitioner",
])

export function canSeeToolsSection(role: UserRole): boolean {
  return TOOLS_SECTION_ROLES.has(role)
}

/**
 * Bio Capture is a tool, not a vertical, so it does not come from the registry.
 * It moved out of the flat workspace menu on 2026-08-04 and has lived at the top
 * of the Tools rollup since.
 */
const BIO_CAPTURE_ITEM: NavItemDef = {
  to: ROUTES.BIO_CAPTURE,
  icon: BookOpenText,
  label: "Bio Capture",
}

/**
 * The consolidated Tools section, or `null` when this role does not get one.
 *
 * Expanded by default (2026-08-12, request): a super-admin must be able to see
 * and click every tool without first expanding anything. It was previously
 * `defaultCollapsed: true`, which — combined with the duplicate-label collision
 * above — is what made the tools feel hidden.
 */
export function useToolsSection(role: UserRole): NavSectionDef | null {
  // Hooks run unconditionally: the role gate is applied to the RESULT, never by
  // skipping a hook, or the hook order would change between roles.
  const launcherSection = useVerticalLauncherSection()
  const { data: broadcastAccess } = useBroadcastAccess()

  return useMemo(() => {
    if (!canSeeToolsSection(role)) return null

    const candidates: NavItemDef[] = [
      BIO_CAPTURE_ITEM,
      ...(TOOL_ITEMS_BY_ROLE[role] ?? []),
      ...(launcherSection?.items ?? []),
      // Platform Alerts is access-gated by a DB allowlist the owner controls,
      // not by entitlement — so it is withheld entirely rather than greyed. A
      // non-allowlisted super-admin has no upgrade path to advertise.
      ...(broadcastAccess?.authorized ? BROADCAST_SIDEBAR_SECTION.items : []),
    ]

    // Dedupe by destination. The sources genuinely overlap — Interview Practice
    // is both a role tool item and, for the user role, a workspace entry — and a
    // repeated `to` would render twice and double-highlight when active.
    const seen = new Set<string>()
    const items = candidates.filter((item) => {
      if (seen.has(item.to)) return false
      seen.add(item.to)
      return true
    })

    if (items.length === 0) return null

    return {
      label: TOOLS_SECTION_LABEL,
      items,
      defaultCollapsed: false,
    }
  }, [role, launcherSection, broadcastAccess])
}

export default useToolsSection
