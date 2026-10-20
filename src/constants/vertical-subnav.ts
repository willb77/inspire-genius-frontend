import {
  Banknote,
  ClipboardCheck,
  ClipboardList,
  Compass,
  LayoutDashboard,
  MessagesSquare,
  Route as RouteIcon,
  Scale,
  ScanSearch,
  Sparkles,
  Target,
  UserRoundSearch,
  Users,
  Wand2,
  BarChart3,
  BookOpenCheck,
  GraduationCap,
  PiggyBank,
  UserRound,
} from "lucide-react"
import { ROUTES } from "@/constants/routes"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import type { VerticalKey } from "@/verticals/core/types"
import { grantSidebarSectionForRole, KCE_SIDEBAR_SECTION } from "@/constants/sidebar-sections"

/**
 * Per-vertical **sidebar** sub-navigation — the menu that opens in the left rail
 * once you are inside a vertical.
 *
 * Before this module (2026-07-29) only GRANT and Knowledge Continuity had one;
 * Job Fit, Lumen and Job Blueprint kept their tool lists inside the page as
 * horizontal pill rows, so entering those verticals left the sidebar showing
 * nothing but the role menu.
 *
 * **This file is the single source of truth for those lists.** `FitNav` and
 * `LumenNav` import `JOB_FIT_TOOLS` / `LUMEN_TOOLS` from here rather than
 * declaring their own — the in-page row and the sidebar menu are the same
 * navigation and must not drift. The dependency runs page → constants, never
 * the other way.
 *
 * Honor is absent on purpose: it ships its own chrome (`HonorShell`) via
 * `VerticalShell`'s `shell` prop, so Core never renders a sidebar for it.
 */

/** Job Fit — also rendered as the in-page pill row by `FitNav`. */
export const JOB_FIT_TOOLS: NavItemDef[] = [
  { to: ROUTES.JOB_FIT.MATCHES, icon: ScanSearch, label: "My fit" },
  { to: ROUTES.JOB_FIT.GAPS, icon: Target, label: "Gaps" },
  { to: ROUTES.JOB_FIT.PATHWAY, icon: RouteIcon, label: "Pathway" },
  { to: ROUTES.JOB_FIT.BLUEPRINT, icon: Wand2, label: "Blueprint a role" },
  { to: ROUTES.JOB_FIT.TARGET, icon: Sparkles, label: "Fit a JD" },
  { to: ROUTES.JOB_FIT.COACH, icon: MessagesSquare, label: "Coaching" },
]

/** Hover/aria text on the greyed "Blueprint a role" entry for the `user` role. */
export const JOB_FIT_BLUEPRINT_USER_DISABLED_REASON = "Not available for the User role"

/**
 * Job Fit tools as the given role sees them (2026-10-18, request: "For the Role
 * 'User' gray out Blueprint a role"). For `user`, "Blueprint a role" stays
 * listed but greyed and non-navigating; every other role gets `JOB_FIT_TOOLS`
 * unchanged. Built once at module load so the sidebar's `useMemo` sees a stable
 * array.
 *
 * This is a visibility change only — the route is NOT gated, so a `user` who
 * types `/vertical/job-fit/blueprint` still reaches the page.
 *
 * Both the sidebar (`verticalSubNavItems`) and the in-page pill row (`FitNav`)
 * read this, so one account never sees the entry enabled in one place and
 * greyed in the other.
 */
const JOB_FIT_TOOLS_FOR_USER: NavItemDef[] = JOB_FIT_TOOLS.map((item) =>
  item.to === ROUTES.JOB_FIT.BLUEPRINT
    ? { ...item, disabled: true, disabledReason: JOB_FIT_BLUEPRINT_USER_DISABLED_REASON }
    : item,
)

export function jobFitToolsForRole(role: UserRole): NavItemDef[] {
  return role === "user" ? JOB_FIT_TOOLS_FOR_USER : JOB_FIT_TOOLS
}

/** Lumen — also rendered as the in-page pill row by `LumenNav`. */
export const LUMEN_TOOLS: NavItemDef[] = [
  { to: ROUTES.LUMEN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.LUMEN.SELF_PORTRAIT, icon: UserRoundSearch, label: "My Self-Portrait" },
  { to: ROUTES.LUMEN.MOMENTS, icon: Sparkles, label: "Prep Me" },
  // Coaching is gone entirely, in three steps: the nav entry went 2026-08-06,
  // the Lumen Dashboard card 2026-08-12, and the page, hook and question bank
  // were deleted the same day. Unlike Settings below, nothing survives to link
  // to — the path only redirects to the dashboard for old bookmarks. Because
  // this list feeds BOTH the in-page pill row and the sidebar (see the header
  // comment), the one deletion covered both, which is the point of sharing it.
  // Settings intentionally absent (2026-07-31): one Settings entry, in My
  // Workspace. The page still exists at ROUTES.LUMEN.SETTINGS and still routes;
  // only the duplicate sidebar entry was withdrawn, so a person is not choosing
  // between two things called "Settings" depending on which page they are on.
]

/**
 * Job Blueprint — new here. Its seven pages had no nav of any kind; you reached
 * them by URL or by a link from the dashboard.
 */
export const JOB_BLUEPRINT_TOOLS: NavItemDef[] = [
  { to: "/vertical/job-blueprint/dashboard", icon: BookOpenCheck, label: "Dashboard" },
  { to: "/vertical/job-blueprint/authoring", icon: Wand2, label: "Authoring" },
  { to: "/vertical/job-blueprint/candidates", icon: Users, label: "Candidates" },
  { to: "/vertical/job-blueprint/pipeline", icon: ClipboardList, label: "Pipeline" },
  { to: "/vertical/job-blueprint/scorecards", icon: ClipboardCheck, label: "Scorecards" },
  { to: "/vertical/job-blueprint/analytics", icon: BarChart3, label: "Analytics" },
]

/**
 * Direction Setting — also rendered as the in-page pill row by
 * `DirectionSettingNav`. The Journey map leads deliberately: it is the surface
 * that answers "what is the one next thing?", and every other entry here is a
 * shortcut into a stage the user has already reached.
 */
export const DIRECTION_SETTING_TOOLS: NavItemDef[] = [
  { to: ROUTES.DIRECTION_SETTING.JOURNEY, icon: RouteIcon, label: "My journey" },
  { to: ROUTES.DIRECTION_SETTING.PORTRAIT, icon: UserRoundSearch, label: "Who I am" },
  { to: ROUTES.DIRECTION_SETTING.CAREERS, icon: Compass, label: "Career areas" },
  // Salary (stage 4) and Alignment (stage 6) were routed but reachable only
  // from a Journey-map tile. They sit here in journey order so the menu is the
  // map's stage list, not a subset of it (DS-0, 2026-10-20). Visibility only:
  // both pages were already routed and enterable by URL.
  { to: ROUTES.DIRECTION_SETTING.SALARY, icon: Banknote, label: "What it pays" },
  { to: ROUTES.DIRECTION_SETTING.GOALS, icon: Target, label: "My goals" },
  { to: ROUTES.DIRECTION_SETTING.ALIGNMENT, icon: Scale, label: "Goals vs wiring" },
  { to: ROUTES.DIRECTION_SETTING.MATCHES, icon: ScanSearch, label: "Job matches" },
  { to: ROUTES.DIRECTION_SETTING.PLAN, icon: ClipboardList, label: "My plan" },
  { to: ROUTES.DIRECTION_SETTING.INTERVIEW, icon: ClipboardCheck, label: "Interview prep" },
  // Rehearse had no nav entry, and its only other way in was a button on the
  // Interview page gated behind a guide that was never persisted — so the
  // stage was unreachable in practice. It stands on its own: preparing and
  // practising are different sittings, usually on different days.
  { to: ROUTES.DIRECTION_SETTING.REHEARSE, icon: MessagesSquare, label: "Practise answers" },
]

/**
 * Career & Education Discovery (DISC-1) — also its in-page pill row. Journey
 * order. Education paths and Cost and payback are listed honestly as "coming
 * next" stages (DISC-2, DISC-3); their pages say so and show no data.
 */
export const CAREER_DISCOVERY_TOOLS: NavItemDef[] = [
  { to: ROUTES.CAREER_DISCOVERY.JOURNEY, icon: RouteIcon, label: "My journey" },
  { to: ROUTES.CAREER_DISCOVERY.ABOUT, icon: UserRound, label: "About me" },
  { to: ROUTES.CAREER_DISCOVERY.WHO, icon: UserRoundSearch, label: "Who I am" },
  { to: ROUTES.CAREER_DISCOVERY.CAREERS, icon: Compass, label: "Career areas" },
  { to: ROUTES.CAREER_DISCOVERY.PAYS, icon: Banknote, label: "What it pays" },
  { to: ROUTES.CAREER_DISCOVERY.GOALS, icon: Target, label: "My goals" },
  { to: ROUTES.CAREER_DISCOVERY.ALIGNMENT, icon: Scale, label: "Goals vs wiring" },
  { to: ROUTES.CAREER_DISCOVERY.EDUCATION, icon: GraduationCap, label: "Education paths" },
  { to: ROUTES.CAREER_DISCOVERY.COST, icon: PiggyBank, label: "Cost and payback" },
  { to: ROUTES.CAREER_DISCOVERY.PLAN, icon: ClipboardList, label: "My plan" },
]

export type VerticalSubNav = {
  /**
   * Section heading. GRANT and KCE keep the friendlier labels their sections
   * already used ("Financial Aid", not the registry key "GRANT"); the newer
   * verticals fall back to their registry title, which the caller supplies.
   */
  label?: string
  items: NavItemDef[]
}

/**
 * The vertical's sidebar menu, or `null` when Core renders no menu for it
 * (Honor, which brings its own chrome).
 *
 * GRANT is role-aware — coach-capable roles get the extra "My Students" entry —
 * which is why this takes a role rather than being a plain lookup table.
 */
export function verticalSubNavItems(
  vertical: VerticalKey,
  role: UserRole,
): VerticalSubNav | null {
  switch (vertical) {
    case "grant": {
      const section = grantSidebarSectionForRole(role)
      return { label: section.label, items: section.items }
    }
    case "knowledge-continuity":
      return { label: KCE_SIDEBAR_SECTION.label, items: KCE_SIDEBAR_SECTION.items }
    case "job-fit":
      return { items: jobFitToolsForRole(role) }
    case "lumen":
      return { items: LUMEN_TOOLS }
    case "job-blueprint":
      return { items: JOB_BLUEPRINT_TOOLS }
    case "direction-setting":
      return { items: DIRECTION_SETTING_TOOLS }
    case "career-discovery":
      return { items: CAREER_DISCOVERY_TOOLS }
    default:
      return null
  }
}
