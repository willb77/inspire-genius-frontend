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
  MessagesSquare,
  Wand2,
  Users,
  Building2,
  UserCheck,
  Briefcase,
  Brain,
  Sparkles,
  BarChart3,
  MessageCircle,
  GitBranch,
  UserPlus,
  Eye,
  Network,
  BookOpen,
  BookHeart,
  ShieldCheck,
  SearchCheck,
  Activity,
  Target,
} from "lucide-react"

/**
 * Why the three switched-off My Workspace entries are greyed (2026-08-04).
 *
 * NOT an entitlement gate — these are turned off for everyone, so the default
 * "not included in your plan" hover text in {@link NavItemDef} would be a lie.
 * Shared with `useVerticalLauncher` so Job Fit — which is greyed by the same
 * decision but reaches the menu through the vertical registry rather than this
 * list — gives the identical explanation.
 */
export const WORKSPACE_ITEM_UNAVAILABLE_REASON = "Temporarily unavailable"

/** Navigation items for the regular user role */
export const USER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.DASHBOARD, icon: Bot, label: "Chat with Coaches" },
  { to: ROUTES.PRISM_ASSESSMENT, icon: Brain, label: "Request Assessment" },
  { to: ROUTES.DOCUMENTS, icon: FileText, label: "Document Library" },
  { to: ROUTES.INTERVIEW_PRACTICE, icon: MessagesSquare, label: "Interview Practice" },
  { to: ROUTES.FEEDBACK, icon: MessageCircle, label: "Feedback" },
  {
    to: ROUTES.ANALYTICS,
    icon: BarChart3,
    label: "Analytics",
    disabled: true,
    disabledReason: WORKSPACE_ITEM_UNAVAILABLE_REASON,
  },
  { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
]

/**
 * Options for {@link getUserNavItems}.
 *
 * `viewerEmail` is the signed-in user's email, used for owner-only entries.
 * The EMAIL is passed rather than a pre-computed `isOwner` boolean so the
 * owner rule lives in exactly one place (this module, via
 * {@link isPlatformOwner}) and no chrome can apply it slightly differently.
 * Omitting it is fail-closed: the caller gets the non-owner menu.
 */
export interface UserNavOptions {
  viewerEmail?: string | null
}

/**
 * Toggle-aware navigation items for the user role.
 * When Agent Engine is ON, shows "Chat with Meridian" instead of "Chat with Coaches".
 */
export function getUserNavItems(
  agentEngineEnabled: boolean,
  options: UserNavOptions = {},
): NavItemDef[] {
  const ownerOnlyUnlocked = isPlatformOwner(options.viewerEmail)
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
    // Bio Capture moved into the "Tools" rollup (see UserLayout) 2026-08-04 —
    // it is a tool you go to, not a primary workspace shortcut. The route
    // (ROUTES.BIO_CAPTURE) is unchanged; only the sidebar placement moved.
    //
    // Document Library moved DOWN to sit directly above Settings on 2026-08-06
    // (request) — see the tail of this list. It is a reference surface you go to
    // occasionally, not a daily shortcut, so it now sits with Settings/Help
    // rather than among the primary actions. The route is unchanged.
    //
    // Interview Practice — candidate-side STAR rehearsal with Alex (voice-capable).
    { to: ROUTES.INTERVIEW_PRACTICE, icon: MessagesSquare, label: "Interview Practice" },
    // Wave 2 Lane 2.A (P7.1) — Diagnostic Chat removed from user nav; now an
    // admin-only route at /super-admin/agent-trace-console.
    //
    // 2026-07-31 — My Workspace pared back. Request Assessment, Goal Setting,
    // Feedback and the Onboarding Wizard are NOT deleted: their routes still
    // resolve and each is reachable from the surface that owns it (history
    // from the Meridian header rows, the rest from Home and the Tools
    // section). The menu is a shortcut list, not the route table — see
    // HIDDEN_WORKSPACE_ROUTES below for the full accounting so a future
    // reader doesn't assume the pages were dropped.
    //
    // ── 2026-08-04, user request: menu order + three entries switched off ──
    // Live order is Home → Chat with Meridian → Document Library → Interview
    // Practice, then the greyed trio (Analytics, Goals, and Job Fit — spliced
    // in below by useWorkspaceNavItems), then the Settings/Help tail.
    //
    // Analytics, Goals and Job Fit are DISABLED, not removed: still listed, but
    // greyed, lock-marked and non-navigating. Deliberately not deleted — the
    // pages and routes are untouched, so re-enabling is dropping `disabled`
    // here (and from FORCE_DISABLED_VERTICALS in useVerticalLauncher for Job
    // Fit), with no route or layout work. They are NOT added to
    // HIDDEN_WORKSPACE_ROUTES: that constant means "absent from the menu", and
    // these are present — just not usable.
    {
      to: ROUTES.ANALYTICS,
      icon: BarChart3,
      label: "Analytics",
      disabled: true,
      disabledReason: WORKSPACE_ITEM_UNAVAILABLE_REASON,
    },
    // Goals — the "My Goals" interview (Direction Setting stage 5). Promoted to a
    // top-level workspace shortcut 2026-08-04; Job Fit sits beside it, spliced in
    // from WORKSPACE_VERTICALS just below this by useWorkspaceNavItems.
    //
    // ── 2026-08-06, user request: switched back on FOR THE PLATFORM OWNER ONLY ──
    // Everyone else's menu is byte-identical to 2026-08-04 — same position, same
    // greying, same tooltip. Only willb77@3pp.com gets a live row. Position is
    // deliberately unchanged rather than promoted up beside the usable
    // shortcuts, so the owner-gate cannot reshuffle anyone else's menu.
    //
    // This is a SHORTCUT gate, not an access gate. The route was never removed
    // and Goals stayed reachable throughout from the Direction Setting sub-nav
    // ("My goals" in constants/vertical-subnav.ts) and JourneyPage stage 5 — for
    // every user, owner or not. If Goals ever needs to be genuinely unreachable
    // for non-owners, that is a route/authz change and this line is not it.
    ownerOnlyUnlocked
      ? { to: ROUTES.DIRECTION_SETTING.GOALS, icon: Target, label: "Goals" }
      : {
          to: ROUTES.DIRECTION_SETTING.GOALS,
          icon: Target,
          label: "Goals",
          disabled: true,
          disabledReason: WORKSPACE_ITEM_UNAVAILABLE_REASON,
        },
    // Document Library sits directly above Settings as of 2026-08-06 (request),
    // moved down from its old position between Chat and Interview Practice.
    //
    // "Document Library" is in MENU_TAIL_LABELS (useVerticalLauncher) so the
    // workspace-vertical splice lands ABOVE it. Without that, verticals were
    // inserted before "Settings" — i.e. BETWEEN Document Library and Settings —
    // and the two were no longer adjacent.
    { to: ROUTES.DOCUMENTS, icon: FileText, label: "Document Library" },
    { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
    { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
  ]
}

/**
 * Routes deliberately absent from the My Workspace menu as of 2026-07-31.
 *
 * Kept as a named constant rather than deleted comments so the decision is
 * greppable: every one of these pages still exists and still routes; only the
 * sidebar shortcut was withdrawn. Restoring one means adding a line back to
 * {@link getUserNavItems}, nothing more.
 *
 * 2026-08-03 — ROUTES.DOCUMENTS was restored to the menu as "Document Library"
 * and removed from this list. The two must stay in step: a route listed here
 * AND present in getUserNavItems would make this constant lie about the menu.
 */
export const HIDDEN_WORKSPACE_ROUTES = [
  ROUTES.PRISM_ASSESSMENT,
  ROUTES.SUMMIT.BASE,
  ROUTES.FEEDBACK,
  ROUTES.ONBOARDING.WIZARD,
] as const

/**
 * Team Development Studio is feature-flagged for a pilot cohort.
 * Enabled at build time via VITE_FEATURE_TEAM_DEVELOPMENT=true. Declared here
 * (above SUPER_ADMIN_NAV_ITEMS) so both super-admin and manager nav can gate on it.
 */
const TEAM_DEVELOPMENT_ENABLED =
  import.meta.env.VITE_FEATURE_TEAM_DEVELOPMENT === "true"

/**
 * The Team Development Studio nav entry. Shared by the manager "Tools" rollup
 * (via {@link TOOL_ITEMS_BY_ROLE} + UnifiedLayout) and the super-admin "Tools"
 * section, so the label/route/icon stay in one place.
 */
const TEAM_DEVELOPMENT_ITEM: NavItemDef = {
  to: ROUTES.MANAGER.DEVELOPMENT,
  icon: Sparkles,
  label: "Team Development",
}

// Candidate-side interview rehearsal (Alex interview-coach). A universal,
// un-gated feature — surfaced in the "Tools" rollup for every role that renders
// one, so it's discoverable regardless of which role is logged in.
const INTERVIEW_PRACTICE_ITEM: NavItemDef = {
  to: ROUTES.INTERVIEW_PRACTICE,
  icon: MessagesSquare,
  label: "Interview Practice",
}

/**
 * Per-role "Tools" rollup items. Rendered as a collapsible "Tools" section in
 * the sidebar (see UnifiedLayout for manager et al.; SuperAdminLayout for
 * super-admin) rather than as flat top-level nav items. Empty when the pilot
 * flag is off, which collapses the section away entirely.
 */
// NOTE: `user` intentionally omitted — the user role renders UserLayout (flat
// sidebar) which already carries "Interview Practice" in USER_NAV_ITEMS; adding
// it here would also give the user a UnifiedLayout Tools section it never uses.
// These roles render UnifiedLayout / SuperAdminLayout, which show the Tools rollup.
export const TOOL_ITEMS_BY_ROLE: Partial<Record<UserRole, NavItemDef[]>> = {
  manager: [...(TEAM_DEVELOPMENT_ENABLED ? [TEAM_DEVELOPMENT_ITEM] : []), INTERVIEW_PRACTICE_ITEM],
  practitioner: [INTERVIEW_PRACTICE_ITEM],
  "super-admin": [...(TEAM_DEVELOPMENT_ENABLED ? [TEAM_DEVELOPMENT_ITEM] : []), INTERVIEW_PRACTICE_ITEM],
}

/**
 * The super-admin "Tools" rollup section (collapsed by default), or `null` when
 * there are no tool items. SuperAdminLayout splices it into its section list.
 */
export const SUPER_ADMIN_TOOLS_SECTION: NavSectionDef | null =
  (TOOL_ITEMS_BY_ROLE["super-admin"]?.length ?? 0) > 0
    ? {
        label: "Tools",
        items: TOOL_ITEMS_BY_ROLE["super-admin"]!,
        defaultCollapsed: true,
      }
    : null

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
  // Research — consolidated: ask Sage, browse the saved library, and upload
  // documents to the corpus via the standard document pipeline (one nav item).
  { to: ROUTES.SUPER_ADMIN.RESEARCH, icon: BookHeart, label: "Research" },
  // Wave 0.E (P5.1) — Cultural Content is now a domain filter on the Knowledge Base page.
  { to: ROUTES.SUPER_ADMIN.KNOWLEDGE_BASE, icon: BookOpen, label: "Knowledge Base" },
  { to: ROUTES.SUPER_ADMIN.PRISM_MANAGEMENT, icon: BookOpen, label: "PRISM Management" },
  { to: ROUTES.SUPER_ADMIN.PRIVACY_COMPLIANCE, icon: ShieldCheck, label: "Privacy & RTBF" },
  // Wave 2 Lane 2.A (P7.1) — formerly "Diagnostic Chat" at /diagnostic-chat.
  { to: ROUTES.SUPER_ADMIN.AGENT_TRACE_CONSOLE, icon: Network, label: "Agent Trace Console" },
  // Team Development Studio now lives in a dedicated collapsible "Tools" rollup
  // (super-admin: SUPER_ADMIN_TOOLS_SECTION; manager: TOOL_ITEMS_BY_ROLE via
  // UnifiedLayout) rather than inline here.
  { to: ROUTES.SUPER_ADMIN.SETTINGS, icon: Settings, label: "Settings" },
]

/** Navigation items for the manager role */
export const MANAGER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.MANAGER.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.MANAGER.TEAM, icon: Users, label: "Team Management" },
  { to: ROUTES.MANAGER.PRISM_TEAM, icon: Brain, label: "PRISM Team" },
  // Team Development Studio moved into the collapsible "Tools" rollup
  // (TOOL_ITEMS_BY_ROLE, rendered by UnifiedLayout) — no longer a flat item.
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

/**
 * NOT the only owner gate — My Workspace's Goals entry is owner-gated too, but
 * differently, and deliberately so.
 *
 * Routes in {@link OWNER_ONLY_NAV_ROUTES} are REMOVED for non-owners. Goals is
 * instead left in place and greyed (see {@link getUserNavItems}), because it
 * was already a visible-but-disabled row for every user before the owner got
 * it back on 2026-08-06 — removing it would have changed what everyone else
 * sees, which the request did not ask for. Adding Goals to this set would do
 * exactly that, so don't.
 */

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
