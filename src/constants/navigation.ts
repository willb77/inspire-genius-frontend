import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole, RoleConfig } from "@/types/roles"
import { ROUTES } from "@/constants/routes"
import {
  Home,
  FileText,
  Settings,
  HelpCircle,
  Bot,
  CalendarDays,
  LayoutDashboard,
  UsersRound,
  MessageSquarePlus,
  Wand2,
  Users,
  Building2,
  UserCheck,
  Briefcase,
  Brain,
  Sparkles,
  BarChart3,
  MessageCircle,
  Target,
  GitBranch,
  UserPlus,
  Eye,
  Network,
  BookOpen,
  BookHeart,
  ShieldCheck,
  SearchCheck,
  Activity,
} from "lucide-react"

/** Navigation items for the regular user role */
export const USER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.DASHBOARD, icon: Bot, label: "Chat with Coaches" },
  { to: ROUTES.PRISM_ASSESSMENT, icon: Brain, label: "Request Assessment" },
  { to: ROUTES.DOCUMENTS, icon: FileText, label: "My Documents" },
  { to: ROUTES.FEEDBACK, icon: MessageCircle, label: "Feedback" },
  { to: ROUTES.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
]

/**
 * Toggle-aware navigation items for the user role.
 * When Agent Engine is ON, shows "Chat with Meridian" instead of "Chat with Coaches".
 */
export function getUserNavItems(agentEngineEnabled: boolean): NavItemDef[] {
  return [
    { to: ROUTES.HOME, icon: Home, label: "Home" },
    agentEngineEnabled
      ? {
          to: ROUTES.MERIDIAN_CHAT,
          icon: Sparkles,
          label: "Chat with Meridian",
          // T2 — auto-attach the user's most recent PRISM CSV when they
          // enter via the sidebar nav.
          state: { autoLoadPrism: true },
        }
      : { to: ROUTES.DASHBOARD, icon: Bot, label: "Chat with Coaches" },
    // Wave 2 Lane 2.A (P7.1) — Diagnostic Chat removed from user nav; now an
    // admin-only route at /super-admin/agent-trace-console.
    { to: ROUTES.PRISM_ASSESSMENT, icon: Brain, label: "Request Assessment" },
    { to: ROUTES.SUMMIT.BASE, icon: Target, label: "Goal Setting" },
    { to: ROUTES.DOCUMENTS, icon: FileText, label: "My Documents" },
    { to: ROUTES.FEEDBACK, icon: MessageCircle, label: "Feedback" },
    { to: ROUTES.ANALYTICS, icon: BarChart3, label: "Analytics" },
    // Combined Plan §A.E3.4 — Forge onboarding wizard
    { to: ROUTES.ONBOARDING.WIZARD, icon: Wand2, label: "Onboarding Wizard" },
    { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
    { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
  ]
}

/** Navigation items for the super-admin role */
export const SUPER_ADMIN_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.SUPER_ADMIN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.SUPER_ADMIN.USERS, icon: UsersRound, label: "User Management" },
  { to: ROUTES.SUPER_ADMIN.MENTOR_MANAGEMENT, icon: Wand2, label: "Agent Management" },
  { to: ROUTES.SUPER_ADMIN.RLHF_TRAINING, icon: MessageSquarePlus, label: "RLHF Training" },
  { to: ROUTES.SUPER_ADMIN.ANALYTICS, icon: BarChart3, label: "Analytics & Logs" },
  { to: ROUTES.SUPER_ADMIN.AGENT_TRAINER, icon: Brain, label: "Agent Trainer" },
  { to: ROUTES.SUPER_ADMIN.PROCESS_BUILDER, icon: GitBranch, label: "Process Builder" },
  { to: ROUTES.SUPER_ADMIN.BULK_IMPORT, icon: UserPlus, label: "Bulk User Import" },
  { to: ROUTES.SUPER_ADMIN.OBSERVABILITY, icon: Eye, label: "Observability" },
  { to: ROUTES.SUPER_ADMIN.EXPLAINABILITY, icon: SearchCheck, label: "Explainability" },
  { to: ROUTES.SUPER_ADMIN.DEV_TRAFFIC_REPORT, icon: Activity, label: "Dev Traffic Report" },
  // Combined Plan §A.E3.4 — Sage document research
  { to: ROUTES.SUPER_ADMIN.RESEARCH, icon: BookHeart, label: "Document Research" },
  { to: ROUTES.SUPER_ADMIN.RESEARCH_LIBRARY, icon: BookHeart, label: "Research Library" },
  // Wave 0.E (P5.1) — Cultural Content is now a domain filter on the Knowledge Base page.
  { to: ROUTES.SUPER_ADMIN.KNOWLEDGE_BASE, icon: BookOpen, label: "Knowledge Base" },
  { to: ROUTES.SUPER_ADMIN.PRISM_MANAGEMENT, icon: BookOpen, label: "PRISM Management" },
  { to: ROUTES.SUPER_ADMIN.PRIVACY_COMPLIANCE, icon: ShieldCheck, label: "Privacy & RTBF" },
  // Wave 2 Lane 2.A (P7.1) — formerly "Diagnostic Chat" at /diagnostic-chat.
  { to: ROUTES.SUPER_ADMIN.AGENT_TRACE_CONSOLE, icon: Network, label: "Agent Trace Console" },
  { to: ROUTES.SUPER_ADMIN.SETTINGS, icon: Settings, label: "Settings" },
]

/**
 * Team Development Studio is feature-flagged for a pilot manager cohort.
 * Enabled at build time via VITE_FEATURE_TEAM_DEVELOPMENT=true.
 */
const TEAM_DEVELOPMENT_ENABLED =
  import.meta.env.VITE_FEATURE_TEAM_DEVELOPMENT === "true"

/** Navigation items for the manager role */
export const MANAGER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.MANAGER.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.MANAGER.TEAM, icon: Users, label: "Team Management" },
  { to: ROUTES.MANAGER.PRISM_TEAM, icon: Brain, label: "PRISM Team" },
  ...(TEAM_DEVELOPMENT_ENABLED
    ? [{ to: ROUTES.MANAGER.DEVELOPMENT, icon: Sparkles, label: "Team Development" }]
    : []),
  // Combined Plan §A.E3.4 — task agents (Maven/James/Atlas)
  { to: ROUTES.MANAGER.JOB_BLUEPRINT, icon: Briefcase, label: "Job Blueprint" },
  { to: ROUTES.MANAGER.INTERVIEW_PREP, icon: UserCheck, label: "Interview Prep" },
  { to: ROUTES.MANAGER.TEAM_COMPOSITION, icon: UsersRound, label: "Team Composition" },
  { to: ROUTES.MANAGER.BULK_IMPORT, icon: UserPlus, label: "Bulk Import" },
  { to: ROUTES.MANAGER.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.MANAGER.SETTINGS, icon: Settings, label: "Settings" },
]

/** Navigation items for the company-admin role */
export const COMPANY_ADMIN_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.COMPANY_ADMIN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.COMPANY_ADMIN.USERS, icon: UsersRound, label: "User Management" },
  { to: ROUTES.COMPANY_ADMIN.ORGANIZATION, icon: Building2, label: "Organization" },
  { to: ROUTES.COMPANY_ADMIN.BULK_IMPORT, icon: UserPlus, label: "Bulk Import" },
  { to: ROUTES.COMPANY_ADMIN.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.COMPANY_ADMIN.OBSERVABILITY, icon: Eye, label: "AI Observability" },
  { to: ROUTES.COMPANY_ADMIN.CULTURE, icon: BookHeart, label: "Culture Docs" },
  { to: ROUTES.COMPANY_ADMIN.SETTINGS, icon: Settings, label: "Settings" },
]

/**
 * Navigation items for the practitioner role.
 *
 * Phase 1/2 (2026-07-22): the practitioner now renders through the standard
 * SidebarScaffold chrome (via UnifiedLayout) instead of the legacy AppShell,
 * and this array is the single source of truth for the menu. Home + Chat with
 * Meridian + Schedule + Meeting are the new Phase-2 surfaces; every
 * `/practitioner/*` route is entitlement-gated to practitioner + super-admin
 * by ROLE_PERMISSIONS (see src/types/roles.ts).
 */
export const PRACTITIONER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.PRACTITIONER.HOME, icon: Home, label: "Practitioner Home" },
  // Uses the standard My Workspace Meridian chat surface (/meridian/chat — the
  // v2 six-tile-rail experience), not a practitioner-specific copy.
  { to: ROUTES.MERIDIAN_CHAT, icon: Sparkles, label: "Chat with Meridian", state: { autoLoadPrism: true } },
  { to: ROUTES.PRACTITIONER.CLIENTS, icon: UserCheck, label: "My Clients" },
  { to: ROUTES.PRACTITIONER.SCHEDULE, icon: CalendarDays, label: "Schedule" },
  { to: ROUTES.PRACTITIONER.ANALYTICS, icon: BarChart3, label: "Analytics" },
]

/** Navigation items for the distributor role */
export const DISTRIBUTOR_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.DISTRIBUTOR.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.DISTRIBUTOR.NETWORK, icon: Network, label: "Network" },
  { to: ROUTES.DISTRIBUTOR.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.DISTRIBUTOR.SETTINGS, icon: Settings, label: "Settings" },
]

/** Role-view links — lets super-admin jump to any role's dashboard */
const ROLE_VIEW_ITEMS: NavItemDef[] = [
  { to: ROUTES.HOME, icon: Home, label: "User Home" },
  { to: ROUTES.MANAGER.DASHBOARD, icon: Users, label: "Manager" },
  { to: ROUTES.COMPANY_ADMIN.DASHBOARD, icon: Building2, label: "Company Admin" },
  { to: ROUTES.PRACTITIONER.HOME, icon: UserCheck, label: "Practitioner" },
  { to: ROUTES.DISTRIBUTOR.DASHBOARD, icon: Briefcase, label: "Distributor" },
]

/** Sectioned navigation for super-admin (admin tools + role views) */
export const SUPER_ADMIN_NAV_SECTIONS: NavSectionDef[] = [
  { label: "Administration", items: SUPER_ADMIN_NAV_ITEMS, defaultCollapsed: true },
  { label: "Role Views", items: ROLE_VIEW_ITEMS, defaultCollapsed: true },
]

/**
 * Platform owner email — mirrors the backend allow-list
 * (`_AUTHORIZED_EMAILS` in
 * `services/agent-engine/app/routes/super_admin_traffic.py`).
 */
export const PLATFORM_OWNER_EMAIL = "willb77@3pp.com"

/** Case-insensitive owner check for nav gating. */
export function isPlatformOwner(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === PLATFORM_OWNER_EMAIL
}

/**
 * Super-admin nav routes that are visible ONLY to the platform owner.
 * The item stays in its normal section (e.g. Dev Traffic Report under
 * Administration); SuperAdminLayout filters it out for every other
 * super-admin. The Dev Traffic Report backend also hard-403s non-owners,
 * so this is defence-in-depth, not the sole gate.
 */
export const OWNER_ONLY_NAV_ROUTES: ReadonlySet<string> = new Set<string>([
  ROUTES.SUPER_ADMIN.DEV_TRAFFIC_REPORT,
])

/** Lookup from role to its nav items */
export const NAV_ITEMS_BY_ROLE: Record<UserRole, NavItemDef[]> = {
  user: USER_NAV_ITEMS,
  manager: MANAGER_NAV_ITEMS,
  "company-admin": COMPANY_ADMIN_NAV_ITEMS,
  practitioner: PRACTITIONER_NAV_ITEMS,
  distributor: DISTRIBUTOR_NAV_ITEMS,
  "super-admin": SUPER_ADMIN_NAV_ITEMS,
}

/** Home route each role should land on after login */
export const HOME_ROUTE_BY_ROLE: Record<UserRole, string> = {
  user: ROUTES.HOME,
  manager: ROUTES.MANAGER.DASHBOARD,
  "company-admin": ROUTES.COMPANY_ADMIN.DASHBOARD,
  practitioner: ROUTES.PRACTITIONER.HOME,
  distributor: ROUTES.DISTRIBUTOR.DASHBOARD,
  // Super-admins land on the user Home for a simpler default experience;
  // Administration tools remain available via the collapsed sidebar section.
  "super-admin": ROUTES.HOME,
}

/** Full default config per role */
export const DEFAULT_ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  user: {
    role: "user",
    label: "User",
    description: "End user receiving AI coaching",
    homeRoute: ROUTES.HOME,
    navItems: USER_NAV_ITEMS,
  },
  manager: {
    role: "manager",
    label: "Manager",
    description: "Supervisory role with direct-report visibility",
    homeRoute: ROUTES.MANAGER.DASHBOARD,
    navItems: MANAGER_NAV_ITEMS,
  },
  "company-admin": {
    role: "company-admin",
    label: "Company Admin",
    description: "Organization-level administrator",
    homeRoute: ROUTES.COMPANY_ADMIN.DASHBOARD,
    navItems: COMPANY_ADMIN_NAV_ITEMS,
  },
  practitioner: {
    role: "practitioner",
    label: "Practitioner",
    description: "PRISM-accredited coach managing clients",
    homeRoute: ROUTES.PRACTITIONER.DASHBOARD,
    navItems: PRACTITIONER_NAV_ITEMS,
  },
  distributor: {
    role: "distributor",
    label: "Distributor",
    description: "Regional wholesaler of PRISM credits to Practitioners",
    homeRoute: ROUTES.DISTRIBUTOR.DASHBOARD,
    navItems: DISTRIBUTOR_NAV_ITEMS,
  },
  "super-admin": {
    role: "super-admin",
    label: "Super Admin",
    description: "Platform owner with full access",
    homeRoute: ROUTES.HOME,
    navItems: SUPER_ADMIN_NAV_ITEMS,
  },
}
