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
  ClipboardCheck,
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
  // Analytics removed 2026-08-12 (request) — see getUserNavItems below.
  { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
]

/**
 * Toggle-aware navigation items for the user role.
 * When Agent Engine is ON, shows "Chat with Meridian" instead of "Chat with Coaches".
 *
 * Took a `{ viewerEmail }` options object between 2026-08-06 and 2026-08-11, for
 * the owner-only Goals row. Goals is live for everyone now, so the My Workspace
 * menu has no owner-conditional entry left and the parameter went with it. The
 * owner rule itself is unchanged and still lives here — see
 * {@link isPlatformOwner} and {@link OWNER_ONLY_NAV_ROUTES}, which the
 * super-admin chrome still uses for the Dev Traffic Report.
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
    // Practice, then Analytics/Goals/Job Fit (the last spliced in below by
    // useWorkspaceNavItems), then the Settings/Help tail.
    //
    // ── 2026-08-11, user request: Goals and Job Fit switched back ON ──
    // Analytics is the only one of the trio still greyed. Goals is now a live
    // row for every user (see below) and Job Fit's force-disable was lifted in
    // useVerticalLauncher, so entitlement alone decides it. Order is unchanged:
    // both keep the position they held while greyed, so turning them on did not
    // reshuffle anyone's menu.
    //
    // ── 2026-08-12, user request: Analytics REMOVED from My Workspace ──
    // It had been a greyed, lock-marked, non-navigating row since 2026-08-04.
    // A permanently disabled entry is menu noise: it occupies a slot, invites a
    // click, and explains nothing. Now absent, so it joins
    // HIDDEN_WORKSPACE_ROUTES below — that constant means "absent from the
    // menu", which is finally true of Analytics.
    //
    // The page and route (ROUTES.ANALYTICS) are UNTOUCHED and still resolve.
    // Restoring it is one line here plus dropping it from that list.
    // Goals — the "My Goals" interview (Direction Setting stage 5). Promoted to a
    // top-level workspace shortcut 2026-08-04; Job Fit sits beside it, spliced in
    // from WORKSPACE_VERTICALS just below this by useWorkspaceNavItems.
    //
    // Switched off 2026-08-04, unlocked for the platform owner only 2026-08-06,
    // and live for EVERY user as of 2026-08-11 (user request). Position is
    // unchanged across all three states, so turning it on did not reshuffle
    // anyone's menu.
    //
    // This row was only ever a SHORTCUT gate, never an access gate: the route was
    // never removed and Goals stayed reachable throughout from the Direction
    // Setting sub-nav ("My goals" in constants/vertical-subnav.ts) and
    // JourneyPage stage 5. What actually decides access is the
    // `direction-setting` entitlement, now enforced server-side by
    // `require_vertical` on the agent-engine vertical router — so this being a
    // plain live link is correct, not a hole.
    { to: ROUTES.DIRECTION_SETTING.GOALS, icon: Target, label: "Goals" },
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
  // Joined 2026-08-12, when the greyed row was removed rather than left as a
  // permanently-disabled entry. Page and route untouched, as with the rest.
  ROUTES.ANALYTICS,
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
 * (via {@link TOOL_ITEMS_BY_ROLE}) and the super-admin "Tools" section, so the
 * label/route/icon stay in one place.
 *
 * Labelled "Team Development Studio" as of 2026-08-12 (request) — that is the
 * product's own name (TDS), and the truncated "Team Development" read as a
 * category rather than a tool.
 */
const TEAM_DEVELOPMENT_ITEM: NavItemDef = {
  to: ROUTES.MANAGER.DEVELOPMENT,
  icon: Sparkles,
  label: "Team Development Studio",
}

// Candidate-side interview rehearsal (Alex interview-coach). A universal,
// un-gated feature — surfaced in the "Tools" rollup for every role that renders
// one, so it's discoverable regardless of which role is logged in.
const INTERVIEW_PRACTICE_ITEM: NavItemDef = {
  to: ROUTES.INTERVIEW_PRACTICE,
  icon: MessagesSquare,
  label: "Interview Practice",
}

// Live Scored Candidate Interview (Phase 3) — a REAL, scored interview an
// interviewer (manager/practitioner) runs of a candidate who is NOT the
// signed-in user. Distinct route per role since the underlying page is a
// role-layout wrapper, same as Interview Prep.
//
// TODO: gate on the server-side `live_interview_scoring` flag once there is a
// clean mechanism to surface a backend feature flag to the FE nav (e.g. via
// GET /v1/agents/me). No such mechanism exists today — interview-practice v5
// personalization degrades gracefully per-request rather than gating
// visibility, so there's nothing to reuse here. Gated by role only for now;
// the backend routes 404 when the flag is off, which is an acceptable
// fallback (not a broken link — just an inert menu entry until launch).
const INTERVIEW_LIVE_ITEM_MANAGER: NavItemDef = {
  to: ROUTES.MANAGER.INTERVIEW_LIVE,
  icon: ClipboardCheck,
  label: "Live Interview",
}
const INTERVIEW_LIVE_ITEM_PRACTITIONER: NavItemDef = {
  to: ROUTES.PRACTITIONER.INTERVIEW_LIVE,
  icon: ClipboardCheck,
  label: "Live Interview",
}

// Interview Studio — a flexible, scored interview built from the interviewer's
// OWN questions or generated from a topic (career discovery, values, onboarding
// …), not the fixed STAR bank. Same server-side `live_interview_scoring` flag +
// interviewer role gate as Live Interview; the backend 404s when the flag is
// off (inert menu entry, not a broken link — same TODO as above re: FE flag
// surfacing). One item per role since the page is a role-layout wrapper.
const INTERVIEW_STUDIO_ITEM_MANAGER: NavItemDef = {
  to: ROUTES.MANAGER.INTERVIEW_STUDIO,
  icon: Sparkles,
  label: "Interview Studio",
}
const INTERVIEW_STUDIO_ITEM_PRACTITIONER: NavItemDef = {
  to: ROUTES.PRACTITIONER.INTERVIEW_STUDIO,
  icon: Sparkles,
  label: "Interview Studio",
}
const INTERVIEW_STUDIO_ITEM_SUPER_ADMIN: NavItemDef = {
  to: ROUTES.SUPER_ADMIN.INTERVIEW_STUDIO,
  icon: Sparkles,
  label: "Interview Studio",
}
// Super-admin Live Interview — the route and page were added 2026-08-12; manager
// and practitioner already had theirs. Same role-layout-wrapper pattern.
const INTERVIEW_LIVE_ITEM_SUPER_ADMIN: NavItemDef = {
  to: ROUTES.SUPER_ADMIN.INTERVIEW_LIVE,
  icon: ClipboardCheck,
  label: "Live Interview",
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
  manager: [
    ...(TEAM_DEVELOPMENT_ENABLED ? [TEAM_DEVELOPMENT_ITEM] : []),
    INTERVIEW_PRACTICE_ITEM,
    INTERVIEW_LIVE_ITEM_MANAGER,
    INTERVIEW_STUDIO_ITEM_MANAGER,
  ],
  practitioner: [
    INTERVIEW_PRACTICE_ITEM,
    INTERVIEW_LIVE_ITEM_PRACTITIONER,
    INTERVIEW_STUDIO_ITEM_PRACTITIONER,
  ],
  // Super-admin is entitled to all four unconditionally (2026-08-12, request:
  // "add Live Interview, Interview Studio, Team Development Studio to super
  // admin entitlement"). Note Team Development Studio is NOT behind
  // TEAM_DEVELOPMENT_ENABLED here, unlike the manager list above: that build
  // flag scopes the manager PILOT cohort, and gating the platform owner on a
  // pilot flag is what made the entry vanish from super-admin builds where the
  // flag was unset. Manager keeps the flag; super-admin does not.
  "super-admin": [
    TEAM_DEVELOPMENT_ITEM,
    INTERVIEW_PRACTICE_ITEM,
    INTERVIEW_LIVE_ITEM_SUPER_ADMIN,
    INTERVIEW_STUDIO_ITEM_SUPER_ADMIN,
  ],
}

// SUPER_ADMIN_TOOLS_SECTION was removed 2026-08-12. It wrapped
// TOOL_ITEMS_BY_ROLE["super-admin"] in a section labelled "Tools", which is now
// assembled — together with the vertical catalogue, Bio Capture and Platform
// Alerts — by `useToolsSection` (src/hooks/nav/useToolsSection.ts). Having a
// second thing that built a "Tools" section is precisely what produced two
// same-labelled sections and the reconciliation bug documented there.

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
  // Team Development Studio lives in the consolidated "Tools" section
  // (useToolsSection, fed by TOOL_ITEMS_BY_ROLE) rather than inline here.
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
