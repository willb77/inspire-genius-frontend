import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole, RoleConfig } from "@/types/roles"
import { ROUTES } from "@/constants/routes"
import { INTAKE_PRESETS, intakePresetHref } from "@/constants/intake"
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
  ScrollText,
  Wand2,
  Users,
  Building2,
  UserCheck,
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
  Handshake,
  HeartPulse,
  IdCard,
  GraduationCap,
  Inbox,
  Filter,
  CreditCard,
  PieChart,
  Dna,
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
 * Role Play — the candidate-side interview rehearsal at /interview-practice
 * (Alex interview-coach, voice-capable). Universal and un-gated.
 *
 * Renamed 2026-10-18 (request: "Change Practice Interview to Role Play and add
 * both to each users menu"). It was "Interview Practice" in the user menu and
 * "Practice Interview" under the coach roles' Interview Studio group; it is now
 * ONE item, "Role Play", in EVERY role's main menu, and it left the Interview
 * Studio group so no sidebar lists it twice. Only the label changed — the route,
 * page, files and API paths keep their interview-practice names.
 *
 * The label must stay unique within a menu: `SidebarScaffold` keys nav items by
 * label, so a duplicate collides during reconciliation.
 */
export const ROLE_PLAY_ITEM: NavItemDef = {
  to: ROUTES.INTERVIEW_PRACTICE,
  icon: MessagesSquare,
  label: "Role Play",
}

/**
 * Résumé Writer — the person's OWN résumé, drafted from their own résumé/bio
 * and PRISM, at /my/resume. Universal and un-gated (2026-10-19, request: "add
 * Résumé Writer to every user's menu but give it a UI that matches the platform
 * under My Workspace"; Résumé Writer CSA, option 1).
 *
 * Not the Honor coach tool at /vertical/honor/resume, which writes for a Fellow
 * and stays where it is. Sits directly after {@link ROLE_PLAY_ITEM} in every
 * role's main menu, so the Career Fit splice (above the Document Library /
 * Settings / Help tail) now lands after it. Generation is server-switched and
 * capped per person per day; the page says so when either applies.
 */
export const RESUME_WRITER_ITEM: NavItemDef = {
  to: ROUTES.MY_RESUME,
  icon: ScrollText,
  label: "Résumé Writer",
}

/**
 * The user role's menu — the only definition (RM-9b, 2026-11-26: the static
 * `USER_NAV_ITEMS` copy, whose chat row still read "Chat with Coaches" →
 * /dashboard on Surveys, PRISM exam, vertical pages and Lumen's no-access page,
 * is gone; every layout now reaches this through {@link roleNavItems}).
 *
 * **Eight fixed entries** as of 2026-09-30. Six were fixed on 2026-08-12
 * (request: "for all User roles only show these menu items on the left side
 * menu"); Goals returned on 2026-09-04 as the ungated My Goals surface
 * (Goals offering, Phase 3 — decision D8: base product, not a vertical); My
 * development joined on 2026-09-30 (TDS-4c), on the same footing:
 *
 *   Home · Chat with Meridian · Goals Studio · [Career & Education Discovery] ·
 *   [Career Fit] · Role Play · My development · Résumé Writer · Document Library ·
 *   Settings · Help & Support
 *
 * Order fixed 2026-10-29 (request). The bracketed rows are spliced in front of
 * Role Play by `useWorkspaceNavItems`, for entitled accounts only.
 *
 * "Interview Practice" became "Role Play" on 2026-10-18 (request). Career Fit
 * (2026-10-18, request) is the bracketed ninth row: it is NOT in this list but
 * spliced in by `useWorkspaceNavItems`, and only for an account entitled to the
 * `job-fit` vertical — hidden, not greyed, otherwise, and hidden while the
 * entitlement read is loading or has failed.
 *
 * "Goals" became "Goals Studio" on 2026-09-04 (request) — the same name the
 * coach roles see under Tools, so a member and their coach are talking about
 * the same thing. The row is not owner-gated and not greyed; it is the base
 * product.
 *
 * The chat row is the only variation: it points at Meridian when the Agent
 * Engine toggle is on (the default) and falls back to "Chat with Coaches"
 * when it is off. Eight items either way — the toggle changes the
 * destination, not the shape of the menu.
 *
 * ## One thing is spliced in
 *
 * `useWorkspaceNavItems` merges workspace verticals into this list.
 * `WORKSPACE_VERTICALS` was emptied on 2026-08-12 and holds `job-fit` again as
 * of 2026-10-18, so an entitled account sees Career Fit between Role Play and
 * Document Library. `WORKSPACE_VERTICAL_LINKS` (Resume Writer) stays empty.
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
 * **Job Fit** (titled "Career Fit") was undiscoverable for the `user` role
 * from 2026-08-12, when `WORKSPACE_VERTICALS` was emptied, until 2026-10-18,
 * when it returned to every role's menu as "Career Fit" for entitled accounts.
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
    // Candidate-side STAR rehearsal with Alex (voice-capable). "Role Play"
    // since 2026-10-18 (request). Career & Education Discovery and Career Fit,
    // when entitled, splice in directly IN FRONT of it (2026-10-29, request).
    ROLE_PLAY_ITEM,
    // My development (TDS-4c, 2026-09-30) — the member's own view of the rows a
    // coach sees about them in the Team Development Studio. Moved from beside
    // Goals Studio to after Role Play on 2026-10-29 (request). Gated on nothing
    // but sign-in: every read behind the page is a `/v1/growth/me/*` route that
    // resolves the member from the token, so a plain `user` reaches all of it
    // with no manager involved.
    //
    // Deliberately NOT between Document Library and Settings: the adjacency of
    // those two is asserted as exactly one apart (navigation.test.ts), which is
    // what caught the workspace-vertical splice landing in that gap.
    { to: ROUTES.MY_DEVELOPMENT, icon: HeartPulse, label: "My development" },
    RESUME_WRITER_ITEM,
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
  // ROUTES.JOB_FIT.MATCHES left this list on 2026-10-18 (request): it is in the
  // menu again as "Career Fit" for accounts entitled to `job-fit`, spliced in by
  // useWorkspaceNavItems. Listing it here as well would make this constant lie.
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
 * The practitioner's Studio entry.
 *
 * A SEPARATE item from {@link TEAM_DEVELOPMENT_ITEM} pointing at
 * /practitioner/development, not a shared one. ProtectedRoute gates by path
 * prefix and `practitioner` has no `/manager` prefix in ROLE_PERMISSIONS, so
 * reusing the manager item here would render a menu entry that silently
 * bounces a practitioner to their home page — live-looking and dead.
 *
 * U9 (decision D3): a practitioner's Studio is the "Client Development
 * Studio", and it leads the practitioner's main menu
 * ({@link PRACTITIONER_NAV_ITEMS}) instead of sitting in Tools. The page
 * title says the same (`DEV_TEXT_PRACTITIONER`). Until U11 the roster behind
 * it is the practitioner's own organisation plus anyone they added, not their
 * clients; the page's scope line says so.
 */
const TEAM_DEVELOPMENT_ITEM_PRACTITIONER: NavItemDef = {
  to: ROUTES.PRACTITIONER.DEVELOPMENT,
  icon: Sparkles,
  label: "Client Development Studio",
}

/** Job Blueprint — role-scoped routes, one item each. Both already routed. */
const JOB_BLUEPRINT_ITEM_MANAGER: NavItemDef = {
  to: ROUTES.MANAGER.JOB_BLUEPRINT,
  icon: ClipboardList,
  label: "Role Blueprint Match",
}

const JOB_BLUEPRINT_ITEM_PRACTITIONER: NavItemDef = {
  to: ROUTES.PRACTITIONER.JOB_BLUEPRINT,
  icon: ClipboardList,
  label: "Role Blueprint Match",
}

// The candidate-side interview rehearsal sat UNDER the Interview Studio entry
// in the Tools rollup as "Practice Interview" from 2026-09-23 until 2026-10-18,
// when it became "Role Play" in every role's main menu (ROLE_PLAY_ITEM above)
// and left the group, so no sidebar lists it twice.

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

// Interview Studio as a GROUP (2026-09-23, request: "move Live Interview, and
// add a link to Practice Interview under Interview Studio"). The parent row is
// still the Interview Studio page — clicking it navigates and opens the group;
// Live Interview sits indented beneath it. One group per role because the
// parent and Live Interview are role-prefixed routes. Practice Interview left
// the group on 2026-10-18 (request) and is "Role Play" in the main menu.
const INTERVIEW_STUDIO_GROUP_MANAGER: NavItemDef = {
  ...INTERVIEW_STUDIO_ITEM_MANAGER,
  children: [INTERVIEW_LIVE_ITEM_MANAGER],
}
const INTERVIEW_STUDIO_GROUP_PRACTITIONER: NavItemDef = {
  ...INTERVIEW_STUDIO_ITEM_PRACTITIONER,
  children: [INTERVIEW_LIVE_ITEM_PRACTITIONER],
}
const INTERVIEW_STUDIO_GROUP_SUPER_ADMIN: NavItemDef = {
  ...INTERVIEW_STUDIO_ITEM_SUPER_ADMIN,
  children: [INTERVIEW_LIVE_ITEM_SUPER_ADMIN],
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

// Character Lab for the coach roles (2026-10-07, request). Role-prefixed
// routes, one item each, because ProtectedRoute gates by path prefix and
// neither role can open /super-admin/*. Same body as the super-admin page but
// without CSV export or CSV import — see CharacterLabBodyProps.fullAccess.
const CHARACTER_LAB_ITEM_MANAGER: NavItemDef = {
  to: ROUTES.MANAGER.CHARACTER_LAB,
  icon: Drama,
  label: "Character Lab",
}
const CHARACTER_LAB_ITEM_PRACTITIONER: NavItemDef = {
  to: ROUTES.PRACTITIONER.CHARACTER_LAB,
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
// sidebar) which already carries "Role Play" (getUserNavItems); adding it here
// would also give the user a UnifiedLayout Tools section it never uses.
// These roles render UnifiedLayout / SuperAdminLayout, which show the Tools rollup.
export const TOOL_ITEMS_BY_ROLE: Partial<Record<UserRole, NavItemDef[]>> = {
  // 2026-08-31 (request): manager and practitioner do the same job — they hold
  // a roster of people and advise them — so they get the SAME tool set. The
  // items differ only in which role-prefixed route they point at, because
  // ProtectedRoute gates by path prefix.
  manager: [
    // Team Development Studio is NOT here any more — it is the first entry in
    // MANAGER_NAV_ITEMS as of 2026-09-05. Listing it in both places renders it
    // twice in the same sidebar. Super-admin keeps theirs in Tools, because
    // their main nav is unchanged. The practitioner's left Tools in U9.
    // Goals Studio left this list in RM-4 (2026-11-25): it is in the role's My
    // Workspace section now ({@link getWorkspaceSectionItems}). Super-admin
    // keeps it in Tools.
    JOB_BLUEPRINT_ITEM_MANAGER,
    INTERVIEW_STUDIO_GROUP_MANAGER,
    CHARACTER_LAB_ITEM_MANAGER,
  ],
  practitioner: [
    // The Client Development Studio is NOT here any more — it leads
    // PRACTITIONER_NAV_ITEMS since U9, the same move the manager's Studio made
    // on 2026-09-05. Listing it in both places renders it twice in the same
    // sidebar. Goals Studio moved to My Workspace in RM-4, as for the manager.
    JOB_BLUEPRINT_ITEM_PRACTITIONER,
    INTERVIEW_STUDIO_GROUP_PRACTITIONER,
    CHARACTER_LAB_ITEM_PRACTITIONER,
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
    INTERVIEW_STUDIO_GROUP_SUPER_ADMIN,
    CHARACTER_LAB_ITEM,
  ],
}

/**
 * JF-13 — the role tools that fold into the "Talent Studio" group when
 * `job_fit_v2` is on for the person (see `useToolsSection`). Matched by object
 * identity against {@link TOOL_ITEMS_BY_ROLE}, not by label, so a rename of
 * either entry cannot silently drop it out of the group or leave it loose.
 *
 * Talent Studio holds two sections — job blueprint, then interview — with
 * Knowledge Continuity Studio under them. SidebarScaffold renders one level of
 * children, so an Interview Studio group nested inside Talent Studio would hide
 * Live Interview; `useToolsSection` lifts the group's children up beside it.
 * Off (switch loading, unreadable or false) this set is never read.
 */
export const TALENT_STUDIO_BLUEPRINT_TOOLS: ReadonlySet<NavItemDef> = new Set<NavItemDef>([
  JOB_BLUEPRINT_ITEM_MANAGER,
  JOB_BLUEPRINT_ITEM_PRACTITIONER,
])
export const TALENT_STUDIO_INTERVIEW_TOOLS: ReadonlySet<NavItemDef> = new Set<NavItemDef>([
  INTERVIEW_STUDIO_GROUP_MANAGER,
  INTERVIEW_STUDIO_GROUP_PRACTITIONER,
  INTERVIEW_STUDIO_GROUP_SUPER_ADMIN,
])

/**
 * TS-3 — the interview rows inside Talent Studio, named by purpose.
 *
 * With `job_fit_v2` on, each role's Interview Studio group is shown as these
 * rows, next to each other, instead of "Interview Studio" with "Live
 * Interview" lifted beside it. The destinations are today's pages; only the
 * labels and the list change. Two existing pages that the menu did not list
 * are added for the roles that have the route: question preparation (manager,
 * practitioner) and the list of interviews already run (manager only).
 *
 * The rows do NOT read the house-style switch (`house_style_interview`,
 * `src/lib/house/areaSwitch.ts`). That switch decides which screen the two run
 * pages show: with it on, both show the one interview screen, which opens on
 * "hiring" at the live route and on "your own questions" at the studio route;
 * with it off, they are two different screens. A label that says what the row
 * is FOR is right in both cases, so the menu is the same in both.
 *
 * Every row says "interview" or sits between two that do. SidebarScaffold
 * renders one level of children and Talent Studio is already that level, so
 * the rows cannot be nested under an "Interviews" heading of their own.
 *
 * Pairs of [group object in {@link TALENT_STUDIO_INTERVIEW_TOOLS}, its rows].
 * An array, not a Map, on purpose: the label registry test
 * (`navLabels.test.ts`) walks arrays and Sets to find every label the menus
 * declare, and labels held in a Map would be invisible to it. Off (switch
 * loading, unreadable or false) this list is never read.
 */
const purposeRows = (routes: { live: string; studio: string; prep?: string; past?: string }): NavItemDef[] => [
  { to: routes.live, icon: ClipboardCheck, label: "Hiring interview" },
  { to: routes.studio, icon: Sparkles, label: "Own-questions interview" },
  ...(routes.prep ? [{ to: routes.prep, icon: ClipboardList, label: "Prepare questions" }] : []),
  ...(routes.past ? [{ to: routes.past, icon: ScrollText, label: "Past interviews" }] : []),
]
export const TALENT_STUDIO_INTERVIEW_ROWS: ReadonlyArray<readonly [NavItemDef, readonly NavItemDef[]]> = [
  [
    INTERVIEW_STUDIO_GROUP_MANAGER,
    purposeRows({
      live: ROUTES.MANAGER.INTERVIEW_LIVE,
      studio: ROUTES.MANAGER.INTERVIEW_STUDIO,
      prep: ROUTES.MANAGER.INTERVIEW_PREP,
      past: ROUTES.MANAGER.INTERVIEWS,
    }),
  ],
  [
    INTERVIEW_STUDIO_GROUP_PRACTITIONER,
    purposeRows({
      live: ROUTES.PRACTITIONER.INTERVIEW_LIVE,
      studio: ROUTES.PRACTITIONER.INTERVIEW_STUDIO,
      prep: ROUTES.PRACTITIONER.INTERVIEW_PREP,
    }),
  ],
  [
    INTERVIEW_STUDIO_GROUP_SUPER_ADMIN,
    purposeRows({ live: ROUTES.SUPER_ADMIN.INTERVIEW_LIVE, studio: ROUTES.SUPER_ADMIN.INTERVIEW_STUDIO }),
  ],
]

/**
 * TS-2 — the rows Talent Studio gains so the group reads in the order the work
 * runs: Overview, Roles, Candidates, Interviews, Insights, then Knowledge
 * Continuity as "Retain". Read only with `job_fit_v2` on (`useToolsSection`).
 *
 * Declared here, not built inside the hook, for the same reason the TS-3 rows
 * are: the label registry test walks this module's arrays and objects to find
 * every label the menus declare.
 *
 * Overview is one page mounted under each role's own prefix, because
 * ProtectedRoute gates by path prefix (a practitioner has no `/manager`).
 * Pairs of [role, row]; an array, not a Map, so the registry test sees it.
 */
export const TALENT_STUDIO_OVERVIEW_ROWS: ReadonlyArray<readonly [UserRole, NavItemDef]> = [
  ["manager", { to: ROUTES.MANAGER.TALENT_STUDIO, icon: LayoutDashboard, label: "Overview" }],
  ["practitioner", { to: ROUTES.PRACTITIONER.TALENT_STUDIO, icon: LayoutDashboard, label: "Overview" }],
  ["super-admin", { to: ROUTES.SUPER_ADMIN.TALENT_STUDIO, icon: LayoutDashboard, label: "Overview" }],
]

/**
 * Candidates and Insights are two pages INSIDE the `job-blueprint` vertical
 * (its Candidates and Analytics tabs). They are shown only when the launcher
 * lists that vertical, and they copy its lock: greyed with the same reason
 * when the person is not entitled, so neither is a live link that bounces.
 */
export const TALENT_STUDIO_BLUEPRINT_PAGE_ROWS: { candidates: NavItemDef; insights: NavItemDef } = {
  candidates: { to: ROUTES.JOB_DNA.CANDIDATES, icon: Users, label: "Candidates" },
  insights: { to: ROUTES.JOB_DNA.ANALYTICS, icon: BarChart3, label: "Insights" },
}

/**
 * TS-5 — "Job DNA": the manager's own list of role benchmarks, with the
 * validation reviewer queue on it. The page has existed at this route for
 * some time and no menu linked to it. Manager only: the route sits under the
 * manager prefix and no other role has a counterpart page, so no other role
 * gets a row.
 *
 * The page reads the Role Blueprints data, so the row is shown in the `roles`
 * stage, only when the launcher lists that vertical, and it copies the
 * vertical's lock and reason (`blueprintPageRow` in `useToolsSection`). The
 * label is the page's own heading, which every language keeps as "Job DNA",
 * so it has no menu translation key and paints as declared.
 *
 * Pairs of [role, row]; an array, not a Map, so the label registry test sees it.
 */
export const TALENT_STUDIO_JOB_DNA_ROWS: ReadonlyArray<readonly [UserRole, NavItemDef]> = [
  ["manager", { to: ROUTES.MANAGER.JOB_DNA, icon: Dna, label: "Job DNA" }],
]

/**
 * TS-4a — "Team fit": the role matches team members already have and have
 * shared, on one page. Manager and practitioner only: they are the two roles
 * with a Team Development Studio roster under their own prefix, and the page
 * opens a member there. Super-admin has no such page and gets no row.
 *
 * Shown only with `job_fit_v2` on AND the build's Team fit flags on
 * (`TEAM_FIT_BUILD_ENABLED`); `useToolsSection` applies both. Pairs of
 * [role, row]; an array, not a Map, so the label registry test sees it.
 */
export const TALENT_STUDIO_TEAM_FIT_ROWS: ReadonlyArray<readonly [UserRole, NavItemDef]> = [
  ["manager", { to: ROUTES.MANAGER.TEAM_FIT, icon: UserCheck, label: "Team fit" }],
  ["practitioner", { to: ROUTES.PRACTITIONER.TEAM_FIT, icon: UserCheck, label: "Team fit" }],
]

/**
 * "Retain": the sidebar has no heading row inside a group, so Knowledge
 * Continuity carries the stage in its label, inside Talent Studio only. `to`
 * here is the vertical's route prefix (used to find the launcher's row); the
 * row itself keeps the launcher's destination, icon and lock.
 */
export const TALENT_STUDIO_RETAIN_ROW: Pick<NavItemDef, "to" | "label"> = {
  to: "/vertical/knowledge-continuity",
  label: "Retain: Knowledge Continuity",
}

/**
 * RM-7 (2026-11-26) — the label and icon of each Talent Studio stage ROW. With
 * `job_fit_v2` on, the group is one row per stage (Bill's RM-D5: "Talent Studio
 * becomes 7 stage pages with tabs"). The rows listed above become the TABS of
 * their stage, under their own labels; a stage of one keeps that one page under
 * the stage's name. Keyed by stage (the keys of `TALENT_STUDIO_STAGE_ORDER` in
 * `useToolsSection`). Objects with `label` and `icon`, not a Map, so the label
 * registry test (`navLabels.test.ts`) sees them.
 */
export const TALENT_STUDIO_STAGE_ROWS = {
  overview: { label: "Overview", icon: LayoutDashboard },
  roles: { label: "Roles", icon: Dna },
  candidates: { label: "Candidates", icon: Users },
  interviews: { label: "Interviews", icon: ClipboardCheck },
  insights: { label: "Insights", icon: BarChart3 },
  teamFit: { label: "Team fit", icon: UserCheck },
  retain: { label: "Retain", icon: BookOpen },
} as const satisfies Record<string, Pick<NavItemDef, "label" | "icon">>

// SUPER_ADMIN_TOOLS_SECTION was removed 2026-08-12. It wrapped
// TOOL_ITEMS_BY_ROLE["super-admin"] in a section labelled "Tools", which is now
// assembled — together with the vertical catalogue, Bio Capture and Platform
// Alerts — by `useToolsSection` (src/hooks/nav/useToolsSection.ts). Having a
// second thing that built a "Tools" section is precisely what produced two
// same-labelled sections and the reconciliation bug documented there.

/**
 * Navigation items for the super-admin role — the Administration section.
 *
 * Role Play and Career Fit are deliberately NOT here (2026-10-18): a
 * super-admin's main menu is the "My Workspace" section, built from
 * {@link getUserNavItems}, which carries both. Listing them here too would put
 * each in the same sidebar twice.
 */
export const SUPER_ADMIN_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.SUPER_ADMIN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.SUPER_ADMIN.USERS, icon: UsersRound, label: "User Management" },
  // The Organizations page existed with no nav entry (reachable only from a
  // Dashboard card). Label must stay unique: SidebarScaffold keys by label.
  { to: ROUTES.SUPER_ADMIN.ORGANIZATIONS, icon: Building2, label: "Organizations" },
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
  // PC-1a — each practitioner's PRISM identifiers, and the client-assignment
  // picker. Label must stay unique: SidebarScaffold keys nav items by label.
  { to: ROUTES.SUPER_ADMIN.PRACTITIONER_REGISTRY, icon: IdCard, label: "Practitioner Registry" },
  // IN-3 — people who signed up through the public intake form, and the
  // webinar sessions they chose. The children are saved views of the
  // Registrations list (a query string each), so they differ by `to`, which is
  // what SidebarScaffold keys sub-items by. Super-admin only: the page sits
  // under /super-admin/* and intake-service checks the role on every route.
  {
    to: ROUTES.SUPER_ADMIN.INTAKE,
    icon: Inbox,
    label: "Intake",
    children: INTAKE_PRESETS.map((preset) => ({ to: intakePresetHref(preset), icon: Filter, label: preset.label })),
  },
  { to: ROUTES.SUPER_ADMIN.PRIVACY_COMPLIANCE, icon: ShieldCheck, label: "Privacy & RTBF" },
  // N-3 — an organisation's cohort read-out, picked from the org directory.
  // Not gated in the menu: the switch is per org, so the page shows the
  // server's refusal for an org that is not enabled. Label must stay unique.
  { to: ROUTES.SUPER_ADMIN.COHORT_READOUT, icon: PieChart, label: "Cohort Read-out" },
  // Client Sign-Up — the operating procedure in
  // docs/operations/IG_Client_Signup_and_SOW_Process.docx, as a working surface:
  // CRM pipeline with the stage gates enforced, the 14-section SOW, and the
  // invoicing hand-off. Label must stay unique — SidebarScaffold keys nav items
  // by label, and a duplicate collides during reconciliation (the bug that made
  // Tools appear to hide behind Administration).
  { to: ROUTES.SUPER_ADMIN.CLIENT_SIGNUP, icon: Handshake, label: "Client Sign-Up" },
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
  // Curriculum (CUR-2): school catalogs — programs, courses, prerequisites,
  // CSV import, publish. Super-admin ONLY (decision E2): no company-admin or
  // other-role entry. The server checks the role on every curriculum route and
  // the page says so plainly while the `curriculum` switch is off.
  { to: ROUTES.SUPER_ADMIN.CURRICULUM, icon: GraduationCap, label: "Curriculum" },
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
  // Member Oversight (U6c, decision D13, 2026-11-24). The Studio roster now
  // carries each person's sharing state as a chip and a filter, so the
  // separate menu row (kept apart on 2026-09-05 because the page "obeys
  // different visibility rules") is gone from the menu WHEN THE STUDIO IS IN
  // IT: the page and its route are unchanged and the Studio opens it as
  // "Engagement" (sign-ins, active days, the attention order). In a build with
  // the pilot flag off there is no Studio to open it from, so the row stays,
  // or a manager would lose the only menu path to the page.
  ...(TEAM_DEVELOPMENT_ENABLED
    ? []
    : [{ to: ROUTES.MANAGER.STUDENTS, icon: ShieldCheck, label: "Member Oversight" }]),
  // Add people (RM-8, was "Team Import") is how the roster grows, so the Join Requests queue lives on
  // it now. That queue is pull-only — nothing notifies a manager when a request
  // arrives — so the button carries a count and the page loads it eagerly;
  // burying it behind a page nobody opens would be worse than the old sidebar
  // entry, not better.
  { to: ROUTES.MANAGER.BULK_IMPORT, icon: UserPlus, label: "Add people" },
  { to: ROUTES.MANAGER.SCHEDULE, icon: CalendarDays, label: "Schedule" },
  // RM-4 (2026-11-25, RM-D1/RM-D2): Role Play and Résumé Writer moved to the
  // My Workspace section, and Settings and Help & Support to the footer
  // section ({@link FOOTER_NAV_ITEMS_BY_ROLE}). This list is the role's own
  // work only. Talent Studio joins it at render time (useRoleMenuFrame).
]

/**
 * Navigation items for the company-admin role.
 *
 * RM-9a (2026-11-26): this IS the house-style menu, baked in. Both tiers built
 * it with the `company-admin` house switch on, and nothing in the app turns the
 * switch off, so the transform that derived it from the classic list
 * (`companyAdminHouseMenu`) is gone. Consequence, by decision: setting
 * `house_style_company-admin=false` in localStorage no longer brings the
 * classic menu back (it still switches the PAGES the area owns).
 *
 * - "People" and "Reports" are the titles of the pages they open (RM-8).
 * - Bulk Import, Culture Docs and AI Observability are tabs of the People,
 *   Organization and Analytics hubs (RM-5), and Cohort Read-out is a tab of
 *   Analytics; each is still opened by its own address.
 * - Role Play and Résumé Writer are in My Workspace; Settings and Help & Support
 *   are in the footer (RM-4). Settings points at the shared /settings, NOT
 *   /company-admin/settings (a placeholder page with sample figures; still
 *   routed, linked from no menu). Costs is linked from no menu either.
 *
 * CSA: docs/analysis/2026-11-26-rm-9-csa.md (monorepo).
 */
export const COMPANY_ADMIN_NAV_ITEMS: NavItemDef[] = [
  { to: ROUTES.COMPANY_ADMIN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.COMPANY_ADMIN.USERS, icon: UsersRound, label: "People" },
  { to: ROUTES.COMPANY_ADMIN.ORGANIZATION, icon: Building2, label: "Organization" },
  { to: ROUTES.COMPANY_ADMIN.ANALYTICS, icon: BarChart3, label: "Reports" },
  { to: ROUTES.SURVEYS, icon: ClipboardList, label: "Surveys" },
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
  // U9 (decision D3): the Studio leads, as the manager's does, and is no longer
  // in the Tools rollup for this role — an item in both places renders twice,
  // and the sidebar keys rows by label. Not gated on
  // VITE_FEATURE_TEAM_DEVELOPMENT: that build flag scopes the manager PILOT
  // cohort, and the practitioner entry has never been behind it.
  // My Clients stays below until U11 folds it into this Studio.
  TEAM_DEVELOPMENT_ITEM_PRACTITIONER,
  { to: ROUTES.PRACTITIONER.HOME, icon: Home, label: "Practitioner Home" },
  // Chat with Meridian moved to the My Workspace section in RM-4. It is the
  // same row (/meridian/chat, autoLoadPrism): the menu takes it from
  // getUserNavItems, not a practitioner-specific copy.
  { to: ROUTES.PRACTITIONER.CLIENTS, icon: UserCheck, label: "My Clients" },
  // TDS U12 (CSA #2210): "Client PRISM Assessments" is retired; a client's
  // PRISM is imported from that client's page under My Clients.
  // PI-2: the practitioner's own client code and PRISM account identifiers.
  { to: ROUTES.PRACTITIONER.PRACTICE, icon: IdCard, label: "My PRISM Practice" },
  { to: ROUTES.PRACTITIONER.SCHEDULE, icon: CalendarDays, label: "Schedule" },
  { to: ROUTES.SURVEYS, icon: ClipboardList, label: "Surveys" },
  { to: ROUTES.PRACTITIONER.ANALYTICS, icon: BarChart3, label: "Reports" },
  // RM-4: Role Play and Résumé Writer are in My Workspace; Settings
  // (/practitioner/settings) and Help & Support are in the footer.
]

/**
 * The distributor menu: five items, with Credits — the core of the role — and
 * Help. Settings stays under the profile picture. This is the house-style menu,
 * now the only one: the classic seven-item list was removed with the classic
 * distributor pages (house style W2a, "remove"). Surveys, Role Play and Résumé
 * Writer are no longer in this menu; their routes still load by address.
 * Display only: it chooses which list to show, never what a distributor may open.
 */
export const DISTRIBUTOR_NAV_ITEMS_HOUSE: NavItemDef[] = [
  { to: ROUTES.DISTRIBUTOR.DASHBOARD, icon: Home, label: "Home" },
  { to: ROUTES.DISTRIBUTOR.NETWORK, icon: Users, label: "My practitioners" },
  { to: ROUTES.DISTRIBUTOR.CREDITS, icon: CreditCard, label: "Credits" },
  { to: ROUTES.DISTRIBUTOR.ANALYTICS, icon: BarChart3, label: "Reports" },
  // Help & Support moved to the footer section in RM-4, beside Settings.
]

/** Navigation items for the distributor role (the house-style list above). */
export const DISTRIBUTOR_NAV_ITEMS: NavItemDef[] = DISTRIBUTOR_NAV_ITEMS_HOUSE

/**
 * RM-4 (2026-11-25) — the shared menu frame for manager, company admin,
 * practitioner and distributor:
 *
 *   role's own work (unlabelled) · My Workspace · Tools · footer (unlabelled)
 *
 * User and super-admin menus are NOT built from this frame and do not change.
 */

/** The My Workspace section's label. */
export const MY_WORKSPACE_SECTION_LABEL = "My Workspace"

/**
 * Roles that get the My Workspace section. Not the distributor (RM-D3, owner decision,
 * 2026-11-25: "distributor stays without My Workspace, footer only").
 */
export const WORKSPACE_SECTION_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  "manager",
  "company-admin",
  "practitioner",
])

/** Rows of the user menu that are NOT in the My Workspace section: the role has
 *  its own home, and Settings and Help & Support are in the footer. */
const WORKSPACE_SECTION_EXCLUDED_ROUTES: ReadonlySet<string> = new Set<string>([
  ROUTES.HOME,
  ROUTES.SETTINGS,
  ROUTES.HELP,
])

/**
 * The My Workspace section's rows: the user menu ({@link getUserNavItems}) less
 * Home, Settings and Help & Support. Same objects, same order (owner decision, 2026-10-29:
 * Chat with Meridian, Goals Studio, [Career & Education Discovery], [Career
 * Fit], Role Play, My development, Résumé Writer, Document Library). The
 * bracketed rows are spliced in front of Role Play by `useWorkspaceNavItems`.
 */
export function getWorkspaceSectionItems(agentEngineEnabled: boolean): NavItemDef[] {
  return getUserNavItems(agentEngineEnabled).filter((i) => !WORKSPACE_SECTION_EXCLUDED_ROUTES.has(i.to))
}

const HELP_FOOTER_ITEM: NavItemDef = { to: ROUTES.HELP, icon: HelpCircle, label: "Help & Support" }
const settingsFooterItem = (to: string): NavItemDef => ({ to, icon: Settings, label: "Settings" })

/**
 * The footer section, per role (RM-D2, owner decision, 2026-11-25: "Footer — Settings +
 * Help & Support for every role"). Each Settings row opens the shared Settings
 * component under the role's own chrome. Company admin's goes to the shared
 * `/settings` (the page the profile picture opens), never
 * `/company-admin/settings`, which is a placeholder with sample figures.
 *
 * A role with no entry here keeps its menu as it was (user, super-admin).
 */
export const FOOTER_NAV_ITEMS_BY_ROLE: Partial<Record<UserRole, NavItemDef[]>> = {
  manager: [settingsFooterItem(ROUTES.MANAGER.SETTINGS), HELP_FOOTER_ITEM],
  "company-admin": [settingsFooterItem(ROUTES.SETTINGS), HELP_FOOTER_ITEM],
  practitioner: [settingsFooterItem(ROUTES.PRACTITIONER.SETTINGS), HELP_FOOTER_ITEM],
  distributor: [settingsFooterItem(ROUTES.DISTRIBUTOR.SETTINGS), HELP_FOOTER_ITEM],
}

/**
 * RM-8 (O-1, 2026-11-26): the super-admin's footer under the house menu only —
 * Settings (moved out of Advanced) and Help & Support. Deliberately NOT a
 * `FOOTER_NAV_ITEMS_BY_ROLE` entry: that map switches a role onto the RM-4
 * menu frame, and the super-admin keeps its own menu. The classic menu is
 * unchanged.
 */
export const SUPER_ADMIN_HOUSE_FOOTER_ITEMS: NavItemDef[] = [
  settingsFooterItem(ROUTES.SUPER_ADMIN.SETTINGS),
  HELP_FOOTER_ITEM,
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
  user: getUserNavItems(true),
  manager: MANAGER_NAV_ITEMS,
  "company-admin": COMPANY_ADMIN_NAV_ITEMS,
  practitioner: PRACTITIONER_NAV_ITEMS,
  distributor: DISTRIBUTOR_NAV_ITEMS,
  "super-admin": SUPER_ADMIN_NAV_ITEMS,
}

/**
 * A role's own menu as a layout should render it (RM-9b, 2026-11-26). For the
 * user role, and any role string outside the six, that is the toggle-aware
 * {@link getUserNavItems} — "Chat with Meridian" with the Agent Engine on, the
 * coaches fallback with it off — the same list `UserLayout` shows on Home. Every
 * other role gets its `NAV_ITEMS_BY_ROLE` list. One source, so the user's menu
 * no longer changes with the page.
 */
export function roleNavItems(role: string, agentEngineEnabled: boolean): NavItemDef[] {
  if (role !== "user" && Object.prototype.hasOwnProperty.call(NAV_ITEMS_BY_ROLE, role)) {
    return NAV_ITEMS_BY_ROLE[role as UserRole]
  }
  return getUserNavItems(agentEngineEnabled)
}

/**
 * Where a manager lands: the Studio when it is in their menu, the Dashboard
 * when it is not. It MUST match the first entry of {@link MANAGER_NAV_ITEMS},
 * which makes the same choice on the same build flag — otherwise login puts a
 * manager on a page their menu does not list. One constant, used by both
 * {@link HOME_ROUTE_BY_ROLE} and {@link DEFAULT_ROLE_CONFIGS}, so the two
 * cannot drift apart. `/manager/dashboard` still routes either way.
 */
const MANAGER_HOME_ROUTE: string = TEAM_DEVELOPMENT_ENABLED
  ? ROUTES.MANAGER.DEVELOPMENT
  : ROUTES.MANAGER.DASHBOARD

/** Home route each role should land on after login */
export const HOME_ROUTE_BY_ROLE: Record<UserRole, string> = {
  user: ROUTES.HOME,
  manager: MANAGER_HOME_ROUTE,
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
    navItems: getUserNavItems(true),
  },
  manager: {
    role: "manager",
    label: "Manager",
    description: "Supervisory role with direct-report visibility",
    homeRoute: MANAGER_HOME_ROUTE,
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
    homeRoute: ROUTES.PRACTITIONER.HOME,
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
