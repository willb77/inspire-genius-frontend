import { useMemo } from "react"
import { BookOpenText, Briefcase } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import {
  TALENT_STUDIO_BLUEPRINT_TOOLS,
  TALENT_STUDIO_INTERVIEW_TOOLS,
  TOOL_ITEMS_BY_ROLE,
} from "@/constants/navigation"
import { BROADCAST_SIDEBAR_SECTION } from "@/constants/sidebar-sections"
import { useVerticalLauncherSection } from "@/components/layout/useVerticalLauncher"
import { useBroadcastAccess } from "@/hooks/super-admin/useBroadcast"
import { useSavedJobsEnabled } from "@/hooks/job-fit/useSavedJobs"

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
  // "Bio Capture Studio" since 2026-09-23 (request). Route unchanged.
  label: "Bio Capture Studio",
}

/**
 * Career Studio (2026-09-23, request): a Tools entry that holds the two
 * career verticals — Career Blueprint (the `job-blueprint` vertical, formerly
 * listed as "Job DNA") and Career Fit (`job-fit`, formerly "Job Fit"). Both
 * still come from the launcher, so their entitlement greying and lock reasons
 * are exactly what the flat catalogue would have shown; they are lifted out of
 * the catalogue and nested here instead of listed twice. The parent has no
 * page of its own (`to: ""`), so the row only opens and closes the group.
 *
 * Since 2026-10-18 (request) Career Fit is in every role's MAIN menu instead
 * (`job-fit` is in `WORKSPACE_VERTICALS`, which the launcher filters out of
 * this catalogue), so the group holds Career Blueprint alone. The job-fit
 * prefix is kept so that taking it back out of `WORKSPACE_VERTICALS` returns it
 * here rather than loose in the catalogue.
 */
export const CAREER_STUDIO_LABEL = "Career Studio"
const CAREER_STUDIO_PREFIXES = ["/vertical/job-blueprint", "/vertical/job-fit"] as const

function splitCareerStudio(items: NavItemDef[]): { group: NavItemDef | null; rest: NavItemDef[] } {
  const children: NavItemDef[] = []
  for (const prefix of CAREER_STUDIO_PREFIXES) {
    const hit = items.find((i) => i.to.startsWith(prefix))
    if (hit) children.push(hit)
  }
  if (children.length === 0) return { group: null, rest: items }
  const rest = items.filter((i) => !children.includes(i))
  return { group: { to: "", icon: Briefcase, label: CAREER_STUDIO_LABEL, children }, rest }
}

/**
 * JF-13 — Talent Studio (behind `job_fit_v2`). With the switch on, Career
 * Studio, the role's Job Blueprint, the Interview Studio group and Knowledge
 * Continuity Studio become ONE group, in two sections plus Knowledge
 * Continuity under them:
 *
 *   Job Blueprint · Career Blueprint · Interview Studio · Live Interview ·
 *   Knowledge Continuity Studio
 *
 * Only grouping moves: every child keeps its own route, label, entitlement
 * greying and lock reason. SidebarScaffold renders ONE level of children, so
 * Interview Studio's own child (Live Interview) is lifted up beside it rather
 * than nested a second level, where it would be unreachable. Vertical children
 * carry their route prefix as `activePrefix`, so the group opens on any page
 * inside them, as Knowledge Continuity's top-level row did.
 *
 * Off — the status read loading, failing or answering false — none of this
 * runs and the section is exactly today's.
 */
export const TALENT_STUDIO_LABEL = "Talent Studio"
const TALENT_STUDIO_BLUEPRINT_PREFIXES = CAREER_STUDIO_PREFIXES
const TALENT_STUDIO_KNOWLEDGE_PREFIX = "/vertical/knowledge-continuity"

function liftVertical(items: NavItemDef[], prefix: string): NavItemDef | null {
  const hit = items.find((i) => i.to.startsWith(prefix))
  return hit ? { ...hit, activePrefix: prefix } : null
}

function withTalentStudio(
  roleTools: NavItemDef[],
  catalogue: NavItemDef[],
): { roleTools: NavItemDef[]; catalogue: NavItemDef[] } {
  const blueprintRole = roleTools.filter((i) => TALENT_STUDIO_BLUEPRINT_TOOLS.has(i))
  const interviewRole = roleTools.filter((i) => TALENT_STUDIO_INTERVIEW_TOOLS.has(i))
  const blueprintVerticals = TALENT_STUDIO_BLUEPRINT_PREFIXES.map((p) => liftVertical(catalogue, p)).filter(
    (i): i is NavItemDef => i !== null,
  )
  const knowledge = liftVertical(catalogue, TALENT_STUDIO_KNOWLEDGE_PREFIX)

  const children: NavItemDef[] = [
    ...blueprintRole,
    ...blueprintVerticals,
    // Interview Studio stays a page; its own children sit beside it.
    ...interviewRole.flatMap(({ children: nested, ...studio }) => [studio, ...(nested ?? [])]),
    ...(knowledge ? [knowledge] : []),
  ]
  if (children.length === 0) return { roleTools, catalogue }

  const folded = new Set<NavItemDef>([...blueprintRole, ...interviewRole])
  const lifted = new Set(children.map((c) => c.to))
  const at = roleTools.findIndex((i) => folded.has(i))
  const keptTools = roleTools.filter((i) => !folded.has(i))
  const group: NavItemDef = { to: "", icon: Briefcase, label: TALENT_STUDIO_LABEL, children }
  const insertAt = at === -1 ? keptTools.length : at
  return {
    roleTools: [...keptTools.slice(0, insertAt), group, ...keptTools.slice(insertAt)],
    catalogue: catalogue.filter((i) => !lifted.has(i.to)),
  }
}

/**
 * The consolidated Tools section, or `null` when this role does not get one.
 *
 * Closed by default again (Bill, 2026-10-12: "collapse the 'Tools' and other
 * menus … so they only show when the > is clicked"). This reverses the
 * 2026-08-12 request that kept it expanded. Two things in SidebarScaffold keep
 * it from feeling hidden this time: the group opens by itself on any page it
 * holds, and a group the user opens stays open (saved per browser).
 */
export function useToolsSection(role: UserRole): NavSectionDef | null {
  // Hooks run unconditionally: the role gate is applied to the RESULT, never by
  // skipping a hook, or the hook order would change between roles.
  const launcherSection = useVerticalLauncherSection()
  const { data: broadcastAccess } = useBroadcastAccess()
  // JF-13: `job_fit_v2`, the same signal JF-8's menus read. Only a server
  // `true` is on; loading, an error and false all keep today's section.
  const jobFitV2 = useSavedJobsEnabled()

  return useMemo(() => {
    if (!canSeeToolsSection(role)) return null

    const baseTools = TOOL_ITEMS_BY_ROLE[role] ?? []
    const launcherItems = launcherSection?.items ?? []
    const { roleTools, catalogue } = jobFitV2
      ? withTalentStudio(baseTools, launcherItems)
      : withCareerStudio(baseTools, launcherItems)

    const candidates: NavItemDef[] = [
      BIO_CAPTURE_ITEM,
      ...roleTools,
      ...catalogue,
      // Platform Alerts is access-gated by a DB allowlist the owner controls,
      // not by entitlement — so it is withheld entirely rather than greyed. A
      // non-allowlisted super-admin has no upgrade path to advertise.
      ...(broadcastAccess?.authorized ? BROADCAST_SIDEBAR_SECTION.items : []),
    ]

    // Dedupe by destination. A repeated `to` would render twice and
    // double-highlight when active. (The overlap this was written for — the
    // interview rehearsal page as both a Tools item and a workspace row — ended
    // on 2026-10-18 when it became "Role Play" in the main menu only.)
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
      defaultCollapsed: true,
    }
  }, [role, launcherSection, broadcastAccess, jobFitV2])
}

/** Today's Tools grouping (switch off): Career Studio just ahead of Interview Studio. */
function withCareerStudio(
  baseTools: NavItemDef[],
  launcherItems: NavItemDef[],
): { roleTools: NavItemDef[]; catalogue: NavItemDef[] } {
  const { group: careerStudio, rest: catalogue } = splitCareerStudio(launcherItems)
  const roleTools = [...baseTools]
  if (careerStudio) {
    // Career Studio sits just ahead of Interview Studio among the role tools
    // (Bio Capture → Team Development → Goals → Career → Interview …), or at
    // the end of them when the role has no Interview Studio entry.
    const at = roleTools.findIndex((i) => i.label === "Interview Studio")
    roleTools.splice(at === -1 ? roleTools.length : at, 0, careerStudio)
  }
  return { roleTools, catalogue }
}

export default useToolsSection
