import {
  LayoutDashboard,
  MessageSquare,
  Star,
  Users,
  UserPlus,
  User,
  Briefcase,
  Clock,
  BookOpen,
  Activity,
  UsersRound,
  Award,
  Building2,
  Grid3x3,
  BarChart3,
  Home,
  PlusCircle,
  FileText,
  Target,
  Settings,
  MessageSquarePlus,
  GraduationCap,
  Wallet,
  Landmark,
  ClipboardList,
  Scale,
  Banknote,
  Megaphone,
  BookOpenCheck,
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

/** Sidebar sections matching the HTML reference designs */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "main",
    label: "Main",
    roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
    items: [
      { to: "/home", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/dashboard", icon: MessageSquare, label: "Chat", badge: 3 },
      { to: "/coaches", icon: Star, label: "PRISM Report" },
    ],
  },
  {
    id: "manager",
    label: "Manager",
    roles: ["manager", "super-admin"],
    items: [
      { to: "/manager/dashboard", icon: LayoutDashboard, label: "Manager Dashboard" },
      { to: "/manager/team", icon: Users, label: "My Team", badge: 14 },
      { to: "/manager/hiring", icon: UserPlus, label: "Hiring" },
      { to: "/manager/candidates", icon: User, label: "Candidates" },
      { to: "/manager/interviews", icon: Briefcase, label: "Interviews" },
      { to: "/manager/job-dna", icon: Clock, label: "Job DNA" },
      { to: "/manager/training", icon: BookOpen, label: "Training" },
      { to: "/manager/career-mgmt", icon: Activity, label: "Career Mgmt" },
      { to: "/manager/team-building", icon: UsersRound, label: "Team Building" },
      { to: "/manager/leadership", icon: Award, label: "Leadership" },
      { to: "/manager/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "company",
    label: "Company",
    roles: ["company-admin", "super-admin"],
    items: [
      { to: "/company-admin/dashboard", icon: Building2, label: "Company Dashboard" },
      { to: "/company-admin/users", icon: Users, label: "Team Management" },
      { to: "/company-admin/costs", icon: BarChart3, label: "Costs & Expenses" },
      { to: "/company-admin/organization", icon: Grid3x3, label: "Organization" },
      { to: "/company-admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "distributor",
    label: "Distributor",
    roles: ["distributor", "super-admin"],
    items: [
      { to: "/distributor/dashboard", icon: Home, label: "Distributor Home" },
      { to: "/distributor/network", icon: User, label: "Network" },
      { to: "/distributor/credits", icon: PlusCircle, label: "Credits" },
      { to: "/distributor/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "practitioner",
    label: "Practitioner",
    roles: ["practitioner", "super-admin"],
    items: [
      { to: "/practitioner/dashboard", icon: Home, label: "Practitioner Home" },
      { to: "/practitioner/clients", icon: Users, label: "My Clients", badge: 24 },
      { to: "/practitioner/credits", icon: PlusCircle, label: "Credits" },
      { to: "/practitioner/conversations", icon: MessageSquare, label: "Conversations" },
      { to: "/practitioner/follow-up", icon: Clock, label: "Follow-Up", badge: 5 },
      { to: "/practitioner/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
    items: [
      { to: "/documents", icon: FileText, label: "Documents" },
      { to: "/goals", icon: Target, label: "Goals" },
      { to: "/feedback", icon: MessageSquarePlus, label: "Feedback" },
      { to: "/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "account",
    label: "Account",
    roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
    items: [
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
]

/**
 * GRANT financial-aid vertical section.
 *
 * NOT part of SIDEBAR_SECTIONS — it is entitlement-gated (not role-gated):
 * AppSidebar appends it only when `useVerticalAccess("grant").hasAccess` is
 * true. Roles are set to all six so the entitlement is the sole gate.
 * Renders through the standard light AppSidebar chrome — no restyling.
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
 * still the gate for showing the section at all (handled in AppSidebar).
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
 * NOT part of SIDEBAR_SECTIONS — it is entitlement-gated (not role-gated):
 * AppSidebar appends it only when
 * `useVerticalAccess("knowledge-continuity").hasAccess` is true. Roles are
 * set to all six so the entitlement is the sole gate.
 */
export const KCE_SIDEBAR_SECTION: SidebarSection = {
  id: "knowledge-continuity",
  label: "Knowledge Continuity",
  roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
  items: [
    { to: "/vertical/knowledge-continuity/dashboard", icon: BookOpenCheck, label: "Program Health" },
  ],
}

// Honor (and any themed vertical whose sub-nav lives in its own shell) is now
// surfaced by the registry-driven launcher — see
// `src/components/layout/useVerticalLauncher.ts`. No per-vertical section here.

/**
 * Broadcast Alerts section.
 *
 * NOT part of SIDEBAR_SECTIONS — it is access-gated (not merely role-gated):
 * AppSidebar appends it only when `useBroadcastAccess().data?.authorized` is
 * true (super-admin on the DB-backed allowlist the owner controls). A
 * super-admin who is not on the allowlist never sees the link.
 */
export const BROADCAST_SIDEBAR_SECTION: SidebarSection = {
  id: "broadcast",
  label: "Platform Alerts",
  roles: ["super-admin"],
  items: [{ to: "/super-admin/broadcast-alert", icon: Megaphone, label: "Broadcast Alerts" }],
}

/** Get sidebar sections visible for a given role (or roles) */
export function getSectionsForRole(role: UserRole | UserRole[]): SidebarSection[] {
  const roles = Array.isArray(role) ? role : [role]
  return SIDEBAR_SECTIONS.filter((s) => s.roles.some((r) => roles.includes(r)))
}
