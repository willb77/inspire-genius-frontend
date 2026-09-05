import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole, RoleConfig } from "@/types/roles"
import { ROUTES } from "@/constants/routes"
import {
  Home,
  FileText,
  FileSpreadsheet,
  Target,
  Flag,
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
  UserPlus,
  Eye,
  Network,
  BookOpen,
  BookHeart,
  ShieldCheck,
  SearchCheck,
  Activity,
  ClipboardCheck,
  ClipboardList,
  FolderOpen,
  Drama,
  LifeBuoy,
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

/**
 * The user role's menu, in order. **Exactly six entries** as of 2026-08-12
 * (request: "for all User roles only show these menu items on the left side
 * menu — Home, Chat with Meridian, Interview Practice, Document Library,
 * Settings, Help & Support").
 *
 * Kept in step with {@link getUserNavItems}, which is the toggle-aware version
 * the layouts actually call. Both must yield the same six labels, because which
 * one renders depends on the layout: `UserLayout` and `SuperAdminLayout` call
 * `getUserNavItems`, while `UnifiedLayout` reads this list through
 * `NAV_ITEMS_BY_ROLE`. They drifted before — this one carried Request
 * Assessment and Feedback long after the other had dropped them — and a menu
 * that changes depending on which page you are on is the bug that creates.
 *
 * Nothing is spliced in any more either: `WORKSPACE_VERTICALS` and
 * `WORKSPACE_VERTICAL_LINKS` (Job Fit, Resume Writer) were emptied in the same
 * change, so this list is the whole menu rather than most of it.
 */
export const USER_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.DASHBOARD, icon: Bot, label: "Chat with Coaches" },
  { to: ROUTES.MY_GOALS.BASE, icon: Flag, label: "Goals Studio" },
  { to: ROUTES.INTERVIEW_PRACTICE, icon: MessagesSquare, label: "Interview Practice" },
  { to: ROUTES.DOCUMENTS, icon: FileText, label: "Document Library" },
  { to: ROUTES.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
]

/**
 * The user role's menu — the toggle-aware version the layouts call.
 *
 * **Exactly seven entries** as of 2026-09-04. Six were fixed on 2026-08-12
 * (request: "for all User roles only show these menu items on the left side
 * menu"); Goals returned on 2026-09-04 as the ungated My Goals surface
 * (Goals offering, Phase 3 — decision D8: base product, not a vertical):
 *
 *   Home · Chat with Meridian · Goals Studio · Interview Practice · Document
 *   Library · Settings · Help & Support
 *
 * "Goals" became "Goals Studio" on 2026-09-04 (request) — the same name the
 * coach roles see under Tools, so a member and their coach are talking about
 * the same thing. The row is not owner-gated and not greyed; it is the base
 * product.
 *
 * The chat row is the only variation: it points at Meridian when the Agent
 * Engine toggle is on (the default) and falls back to "Chat with Coaches"
 * when it is off. Seven items either way — the toggle changes the
 * destination, not the shape of the menu.
 *
 * ## Nothing is spliced in
 *
 * `useWorkspaceNavItems` used to merge workspace verticals into this list, so
 * the rendered menu was longer than what you read here. `WORKSPACE_VERTICALS`
 * (Job Fit) and `WORKSPACE_VERTICAL_LINKS` (Resume Writer) were emptied in the
 * same change, so this IS the menu now.
 *
 * ## What was removed, and why the pages are fine
 *
 * Everything dropped from this list still routes; see
 * {@link HIDDEN_WORKSPACE_ROUTES} for the full accounting. This menu is a
 * shortcut list, not the route table.
 *
 *   - **Goals** (removed 2026-08-12, back 2026-09-04). While it was out it was
 *     only reachable through the Direction Setting sub-nav and JourneyPage
 *     stage 5, both behind the `direction-setting` entitlement — so a user
 *     without that vertical had no way to their own goals. The row now points
 *     at `ROUTES.MY_GOALS.BASE`, which is gated on nothing but sign-in.
 *   - **Analytics** (2026-08-12) — had been greyed and non-navigating since
 *     2026-08-04. A permanently disabled row is menu noise.
 *   - **Request Assessment, Feedback, Onboarding Wizard** (2026-07-31).
 *   - **Bio Capture** (2026-08-04) — moved into the Tools rollup, which is
 *     super-admin only as of 2026-08-12.
 *
 * **Job Fit is the one to watch.** It was spliced in from `WORKSPACE_VERTICALS`,
 * which is now empty — so it falls back into the Tools catalogue rather than
 * disappearing. Tools is super-admin only, which means a super-admin still
 * reaches Job Fit and the `user` role no longer can: nothing on Home or the
 * Meridian header links to it either. The routes resolve, so it is reachable by
 * URL and from the vertical's own pill row once inside, but it is effectively
 * undiscoverable for this role until something links to it again.
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
    // The person's own goals — set in the Summit interview, shared per person
    // by consent (Goals offering, Phase 3). Ungated: every role reaches it.
    { to: ROUTES.MY_GOALS.BASE, icon: Flag, label: "Goals Studio" },
    // Candidate-side STAR rehearsal with Alex (voice-capable).
    { to: ROUTES.INTERVIEW_PRACTICE, icon: MessagesSquare, label: "Interview Practice" },
    // Document Library sits directly above Settings (2026-08-06 request). It is
    // a reference surface you go to occasionally, not a daily shortcut, so it
    // sits with the Settings/Help tail rather than among the primary actions.
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
  // The old /summit route and ROUTES.DIRECTION_SETTING.GOALS left this list on
  // 2026-09-04 (Goals offering, Phase 3). The surface lives at
  // ROUTES.MY_GOALS.BASE and is in the menu as "Goals Studio"; /summit/* is
  // retired. The Direction Setting goals page is stage 5 of that journey, not a
  // withdrawn shortcut — it links to My Goals and is reached from the map.
  ROUTES.FEEDBACK,
  ROUTES.ONBOARDING.WIZARD,
  // Joined 2026-08-12, when the greyed row was removed rather than left as a
  // permanently-disabled entry. Page and route untouched, as with the rest.
  ROUTES.ANALYTICS,
  // Job Fit stopped being spliced in on 2026-08-12 (WORKSPACE_VERTICALS was
  // emptied). Listed here because this constant tracks what is ABSENT from the
  // menu regardless of how it used to get there — but note it is the one entry
  // with no remaining link from any user-facing surface. See getUserNavItems.
  ROUTES.JOB_FIT.MATCHES,
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

/**
 * Goals Studio — the goals surface, listed under Tools for the coach roles
 * (2026-09-04, request: "an offering that for now goes in the Tools left side
 * menu"). ONE item for every role: the surface is ungated and lives at the
 * same path for everyone, so unlike the studios below there is no
 * role-prefixed variant to point at. It feeds Team Development Studio today
 * (the Goals tab reads what a member has shared) and is listed right after it.
 */
const GOALS_STUDIO_ITEM: NavItemDef = {
  to: ROUTES.MY_GOALS.BASE,
  icon: Flag,
  label: "Goals Studio",
}

/**
 * The practitioner's Team Development Studio entry.
 *
 * A SEPARATE item from {@link TEAM_DEVELOPMENT_ITEM} pointing at
 * /practitioner/development, not a shared one. ProtectedRoute gates by path
 * prefix and `practitioner` has no `/manager` prefix in ROLE_PERMISSIONS, so
 * reusing the manager item here would render a menu entry that silently
 * bounces a practitioner to their home page — live-looking and dead.
 */
const TEAM_DEVELOPMENT_ITEM_PRACTITIONER: NavItemDef = {
  to: ROUTES.PRACTITIONER.DEVELOPMENT,
  icon: Sparkles,
  label: "Team Development Studio",
}

/** Job Blueprint — role-scoped routes, one item each. Both already routed. */
const JOB_BLUEPRINT_ITEM_MANAGER: NavItemDef = {
  to: ROUTES.MANAGER.JOB_BLUEPRINT,
  icon: ClipboardList,
  label: "Job Blueprint",
}

const JOB_BLUEPRINT_ITEM_PRACTITIONER: NavItemDef = {
  to: ROUTES.PRACTITIONER.JOB_BLUEPRINT,
  icon: ClipboardList,
  label: "Job Blueprint",
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
 * Character Lab — the fictional-character PRISM demo.
 *
 * Moved out of the flat super-admin list into the Tools rollup on 2026-08-27
 * (request). It is a workbench you open to do something, which is what the
 * Tools section is for, rather than a platform surface you administer.
 *
 * The label must stay unique: `SidebarScaffold` keys nav items by label, so a
 * duplicate collides during reconciliation — the bug that made Tools appear to
 * hide behind Administration.
 */
const CHARACTER_LAB_ITEM: NavItemDef = {
  to: ROUTES.SUPER_ADMIN.CHARACTER_LAB,
  icon: Drama,
  label: "Character Lab",
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
  // 2026-08-31 (request): manager and practitioner do the same job — they hold
  // a roster of people and advise them — so they get the SAME tool set. The
  // items differ only in which role-prefixed route they point at, because
  // ProtectedRoute gates by path prefix.
  manager: [
    // Team Development Studio is NOT here any more — it is the first entry in
    // MANAGER_NAV_ITEMS as of 2026-09-05. Listing it in both places renders it
    // twice in the same sidebar. Practitioner and super-admin keep theirs in
    // Tools, because their main nav is unchanged.
    GOALS_STUDIO_ITEM,
    JOB_BLUEPRINT_ITEM_MANAGER,
    INTERVIEW_PRACTICE_ITEM,
    INTERVIEW_LIVE_ITEM_MANAGER,
    INTERVIEW_STUDIO_ITEM_MANAGER,
  ],
  practitioner: [
    // Not gated on TEAM_DEVELOPMENT_ENABLED: that build flag scopes the manager
    // PILOT cohort, and gating a second role on another role's pilot flag is
    // what made this entry vanish from super-admin builds once already.
    TEAM_DEVELOPMENT_ITEM_PRACTITIONER,
    GOALS_STUDIO_ITEM,
    JOB_BLUEPRINT_ITEM_PRACTITIONER,
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
    GOALS_STUDIO_ITEM,
    INTERVIEW_PRACTICE_ITEM,
    INTERVIEW_LIVE_ITEM_SUPER_ADMIN,
    INTERVIEW_STUDIO_ITEM_SUPER_ADMIN,
    CHARACTER_LAB_ITEM,
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
  // Agent Trainer absorbs the old "Process Builder" row. That row pointed at
  // /super-admin/process-builder, which is only a <Navigate> to
  // /super-admin/agent-trainer/workflows — so it was a second door onto a
  // page inside Agent Trainer, not a separate destination. The Workflow
  // Designer (plus Executions and Approvals, which had no nav entry at all)
  // is now reachable from the Agent Trainer landing page. The redirect route
  // stays registered so existing links and bookmarks keep working.
  { to: ROUTES.SUPER_ADMIN.AGENT_TRAINER, icon: Brain, label: "Agent Trainer" },
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
  { to: ROUTES.SUPER_ADMIN.PRISM_CSV_CONVERTER, icon: FileSpreadsheet, label: "PRISM CSV Converter" },
  { to: ROUTES.SUPER_ADMIN.PRISM_ACCURACY_SCORER, icon: Target, label: "PRISM Accuracy Scorer" },
  { to: ROUTES.SUPER_ADMIN.PRISM_EXAM, icon: ClipboardCheck, label: "PRISM Practitioner Exam" },
  { to: ROUTES.SUPER_ADMIN.PRIVACY_COMPLIANCE, icon: ShieldCheck, label: "Privacy & RTBF" },
  // Support-service tickets: who has each one, escalation, notes, resolve.
  // Label must stay unique - SidebarScaffold keys nav items by label.
  { to: ROUTES.SUPER_ADMIN.SUPPORT_MANAGEMENT, icon: LifeBuoy, label: "Help and Support Management" },
  // Wave 2 Lane 2.A (P7.1) — formerly "Diagnostic Chat" at /diagnostic-chat.
  { to: ROUTES.SUPER_ADMIN.AGENT_TRACE_CONSOLE, icon: Network, label: "Agent Trace Console" },
  // Surveys — build questionnaires + select one to take (shared /surveys surface).
  { to: ROUTES.SURVEYS, icon: ClipboardList, label: "Surveys" },
  // Team Development Studio lives in the consolidated "Tools" section
  // (useToolsSection, fed by TOOL_ITEMS_BY_ROLE) rather than inline here.
  // Asset Library: a standalone S3-hosted tool. This entry points at the in-app
  // launcher, which hands the tool a verified super-admin session so its
  // confidential tier unlocks. Label must stay unique — SidebarScaffold keys
  // nav items by label, so a duplicate collides.
  { to: ROUTES.SUPER_ADMIN.ASSET_LIBRARY, icon: FolderOpen, label: "Asset Library" },
  { to: ROUTES.SUPER_ADMIN.SETTINGS, icon: Settings, label: "Settings" },
]

/**
 * Navigation items for the manager role.
 *
 * Rewritten 2026-08-16 to the order Bill specified: Dashboard, Team Roster
 * (Client), Schedule, Chat with Meridian, Document Library, Team Import,
 * Surveys — then Settings and Help & Support at the foot.
 *
 * ## Four of these are not new pages
 *
 * `ProtectedRoute` role-gates by PATH PREFIX only (`/manager/*`,
 * `/super-admin/*`, …). `/meridian/chat`, `/documents`, `/surveys` and `/help`
 * carry no prefix, so a manager has always been able to open them — they were
 * simply absent from this list. Adding the rows exposes surfaces that already
 * shipped and are already live on staging-b; it does not widen access.
 *
 * ## What was removed, and why the pages are fine
 *
 * PRISM Team, Job Blueprint, Interview Prep, Team Composition and Analytics
 * were dropped from the menu on request. Every one still routes — this is a
 * shortcut list, not the route table, the same convention the user nav follows
 * (see {@link getUserNavItems}). PRISM data has not gone anywhere either: the
 * roster carries each member's PRISM colour, and the full behavioural profile
 * is the first tab of the member workspace under Team Development Studio.
 */
export const MANAGER_NAV_ITEMS: NavItemDef[] = [
  // Consolidated to six entries on 2026-09-05 (request). The manager sidebar
  // carried ELEVEN main items plus fourteen under Tools; a menu that long is a
  // list of everything the platform can do rather than a route to the work.
  //
  // NOTHING WAS DELETED. Every dropped entry still routes and is still reachable
  // by URL and from inside the Studio — this is a shortcut list, not the route
  // table, the same convention the user nav already follows. Dropped from view:
  // Dashboard, Team Roster (Client), Chat with Meridian, Document Library and
  // Surveys. Join Requests is not dropped but MOVED — it is now a button on
  // Team Import, which is the page it belongs to (see BulkImport.tsx).
  //
  // Team Development Studio leads, and is deliberately no longer in the Tools
  // rollup for this role: an item in both places renders twice, and this nav
  // keys by label, which has produced a duplicate-section clash here before.
  //
  // The Studio is the manager's primary surface now, so this must never leave
  // the menu with nothing to land on. `VITE_FEATURE_TEAM_DEVELOPMENT` scopes
  // the pilot cohort and every DEPLOYED build sets it (ci-deploy.yml and
  // .env.staging-b), but `.env.example` ships it false — so a build with the
  // pilot off would have given a manager five entries and no home. It falls
  // back to the Dashboard instead of dropping to nothing. The pilot gate is
  // honoured either way; nobody gains the Studio who did not have it.
  TEAM_DEVELOPMENT_ENABLED
    ? TEAM_DEVELOPMENT_ITEM
    : { to: ROUTES.MANAGER.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  // Kept as a SEPARATE entry rather than merged into anything: Student
  // Oversight obeys different visibility rules from every other roster surface
  // — it shows nothing a student has not agreed to share — and a manager needs
  // to know which set of rules they are reading.
  { to: ROUTES.MANAGER.STUDENTS, icon: ShieldCheck, label: "Student Oversight" },
  // Team Import is how the roster grows, so the Join Requests queue lives on
  // it now. That queue is pull-only — nothing notifies a manager when a request
  // arrives — so the button carries a count and the page loads it eagerly;
  // burying it behind a page nobody opens would be worse than the old sidebar
  // entry, not better.
  { to: ROUTES.MANAGER.BULK_IMPORT, icon: UserPlus, label: "Team Import" },
  { to: ROUTES.MANAGER.SCHEDULE, icon: CalendarDays, label: "Schedule" },
  { to: ROUTES.MANAGER.SETTINGS, icon: Settings, label: "Settings" },
  { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" },
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
  { to: ROUTES.SURVEYS, icon: ClipboardList, label: "Surveys" },
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
  { to: ROUTES.SURVEYS, icon: ClipboardList, label: "Surveys" },
  { to: ROUTES.PRACTITIONER.ANALYTICS, icon: BarChart3, label: "Analytics" },
]

/** Navigation items for the distributor role */
export const DISTRIBUTOR_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.DISTRIBUTOR.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.DISTRIBUTOR.NETWORK, icon: Network, label: "Network" },
  { to: ROUTES.DISTRIBUTOR.ANALYTICS, icon: BarChart3, label: "Analytics" },
  { to: ROUTES.SURVEYS, icon: ClipboardList, label: "Surveys" },
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
 * Routes in {@link OWNER_ONLY_NAV_ROUTES} are REMOVED for non-owners.
 *
 * Goals Studio is NOT in this set and is not owner-gated any more. It was —
 * left in place and greyed for everyone but the owner from 2026-08-06 — until
 * the Goals offering made it base product on 2026-09-04 (Phase 3, D8), open to
 * every signed-in user. Adding it here would take the surface away from the
 * members who share their goals through it, so don't.
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
