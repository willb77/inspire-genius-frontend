import {
  Users,
  Award,
  Building2,
  Target,
  GraduationCap,
  Wallet,
  Landmark,
  ClipboardList,
  Scale,
  Banknote,
  Megaphone,
  BookOpenCheck,
  ClipboardCheck,
  MessagesSquare,
  Wand2,
} from "lucide-react"
import type { UserRole } from "@/types/roles"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"

export type SidebarSection = {
  id: string
  label: string
  roles: UserRole[]
  items: SidebarNavItem[]
}

export type SidebarNavItem = NavItemDef & { badge?: number | string }

// Role menus now come from `NAV_ITEMS_BY_ROLE` (src/constants/navigation.ts),
// rendered by the standard `SidebarScaffold` via `UnifiedLayout` for every role
// and via `VerticalShell` for vertical pages. The legacy role-section catalogue
// (`SIDEBAR_SECTIONS`) and its `getSectionsForRole` reader were removed with the
// old `AppShell`/`AppSidebar` chrome (Phase 6.4). The entitlement-gated vertical
// sections below remain — they are consumed by `useEntitledVerticalItems`
// (role menus) and `VerticalShell` (in-vertical sub-nav).

/**
 * GRANT financial-aid vertical section.
 *
 * Entitlement-gated (not role-gated): surfaced only when
 * `useVerticalAccess("grant").hasAccess` is true. Roles are set to all six so
 * the entitlement is the sole gate. `VerticalShell` renders it as the GRANT
 * pages' in-vertical sub-nav; `useEntitledVerticalItems` links to its first page
 * from the role menu's collapsed "Verticals" section.
 */
export const GRANT_SIDEBAR_SECTION: SidebarSection = {
  id: "grant",
  label: "Financial Aid",
  roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
  items: [
    { to: "/vertical/grant/profile", icon: Wallet, label: "Financial Profile" },
    { to: "/vertical/grant/dashboard", icon: GraduationCap, label: "Aid Dashboard" },
    { to: "/vertical/grant/federal", icon: Landmark, label: "Federal & State" },
    { to: "/vertical/grant/scholarships", icon: Award, label: "Scholarships" },
    { to: "/vertical/grant/institutions", icon: Building2, label: "Institutions" },
    { to: "/vertical/grant/applications", icon: ClipboardList, label: "Application Concierge" },
    { to: "/vertical/grant/compare", icon: Scale, label: "Compare Offers" },
    { to: "/vertical/grant/loans", icon: Banknote, label: "Loans & Debt" },
    { to: "/vertical/grant/plan", icon: Target, label: "My Aid Plan" },
  ],
}

/**
 * Coach roster nav item — "My Students".
 *
 * Appended to GRANT_SIDEBAR_SECTION only for coach-capable roles (see
 * {@link grantSidebarSectionForRole}) that are ALSO grant-entitled. A plain
 * `user` never sees it even with the GRANT entitlement.
 */
export const GRANT_COACH_NAV_ITEM: SidebarNavItem = {
  to: "/vertical/grant/coach/students",
  icon: Users,
  label: "My Students",
}

/** Roles allowed to coach others through the GRANT aid intake. */
export const GRANT_COACH_ROLES: UserRole[] = [
  "practitioner",
  "manager",
  "company-admin",
  "super-admin",
]

/**
 * The GRANT sidebar section for a given role: the base 9 items, plus the
 * "My Students" coach item for coach-capable roles. The GRANT entitlement is
 * still the gate for showing the section at all.
 */
export function grantSidebarSectionForRole(role: UserRole): SidebarSection {
  if (!GRANT_COACH_ROLES.includes(role)) return GRANT_SIDEBAR_SECTION
  return {
    ...GRANT_SIDEBAR_SECTION,
    items: [...GRANT_SIDEBAR_SECTION.items, GRANT_COACH_NAV_ITEM],
  }
}

/**
 * Knowledge Continuity vertical section.
 *
 * Entitlement-gated (not role-gated): surfaced only when
 * `useVerticalAccess("knowledge-continuity").hasAccess` is true. Roles are set
 * to all six so the entitlement is the sole gate.
 */
export const KCE_SIDEBAR_SECTION: SidebarSection = {
  id: "knowledge-continuity",
  label: "Knowledge Continuity",
  roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
  items: [
    { to: "/vertical/knowledge-continuity/blueprint", icon: Wand2, label: "Blueprint a role" },
    { to: "/vertical/knowledge-continuity/capture", icon: MessagesSquare, label: "Start a capture" },
    { to: "/vertical/knowledge-continuity/dashboard", icon: BookOpenCheck, label: "Program Health" },
    { to: "/vertical/knowledge-continuity/review", icon: ClipboardCheck, label: "Reviewer console" },
    { to: "/vertical/knowledge-continuity/curriculum", icon: GraduationCap, label: "Successor curriculum" },
  ],
}

// Honor (and any themed vertical whose sub-nav lives in its own shell) is
// surfaced by the registry-driven launcher — see
// `src/components/layout/useVerticalLauncher.ts`. No per-vertical section here.

/**
 * Broadcast Alerts section.
 *
 * Access-gated (not merely role-gated): surfaced only when
 * `useBroadcastAccess().data?.authorized` is true (super-admin on the DB-backed
 * allowlist the owner controls). A super-admin not on the allowlist never sees
 * the link. Consumed by `useEntitledVerticalItems`.
 */
export const BROADCAST_SIDEBAR_SECTION: SidebarSection = {
  id: "broadcast",
  label: "Platform Alerts",
  roles: ["super-admin"],
  items: [{ to: "/super-admin/broadcast-alert", icon: Megaphone, label: "Broadcast Alerts" }],
}
