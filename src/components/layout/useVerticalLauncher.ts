import { useMemo } from "react"
import {
  Award,
  Briefcase,
  BookOpen,
  Compass,
  Lightbulb,
  Wallet,
} from "lucide-react"
import {
  listVerticals,
  useEnabledVerticals,
  type VerticalKey,
} from "@/verticals/core"
import type { SidebarSection } from "@/constants/sidebar-sections"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import { WORKSPACE_ITEM_UNAVAILABLE_REASON } from "@/constants/navigation"

/**
 * Registry-driven vertical launcher.
 *
 * Replaces per-vertical hardcoded sidebar wiring: instead of each layout
 * appending a bespoke section for GRANT/HONOR/…, the launcher reads the vertical
 * registry and renders one entry link per vertical → its `homePath`. Registering
 * a new vertical's manifest surfaces it everywhere the launcher is mounted — no
 * sidebar edit needed.
 *
 * **Every vertical is listed for every user** (2026-07-28). Entitlement decides
 * whether an entry is *usable*, not whether it is *visible*: a vertical the user
 * has no entitlement for renders greyed out and non-navigating (`disabled`), so
 * the catalogue is discoverable and the gate is legible rather than invisible.
 * Financial Aid (GRANT) and Knowledge Continuity are listed here too — their
 * richer sub-nav lives inside their own shell (`VerticalShell`), reached once
 * you enter, exactly like Honor.
 */

/**
 * Verticals that belong in **My Workspace** rather than the "Tools" section.
 *
 * Empty as of 2026-07-31: Job Fit and Lumen moved out of My Workspace, which is
 * now a five-entry shortcut list. They are NOT hidden — they fall through to the
 * Tools section like every other vertical, and Lumen's own pages plus Job Fit
 * are additionally reachable from the Meridian header's second row.
 *
 * The mechanism is retained rather than deleted: `withWorkspaceVerticals` and
 * `useWorkspaceNavItems` are no-ops while this set is empty (both return their
 * input array unchanged), so re-promoting a vertical is a one-word edit here
 * with no other wiring to redo.
 *
 * 2026-08-04 — Job Fit re-promoted to the workspace menu at the user's request:
 * it showed as a top-level "Job Fit" shortcut (spliced above Settings/Help) and
 * dropped out of the Tools rollup below, which filters `WORKSPACE_VERTICALS`.
 *
 * **Empty again as of 2026-08-12** (request: the user menu is exactly six
 * entries — Home, Chat with Meridian, Interview Practice, Document Library,
 * Settings, Help & Support — and Job Fit is not one of them).
 *
 * Where Job Fit went, precisely: `useVerticalLauncherSection` FILTERS OUT the
 * keys in this set, so emptying it does not orphan the vertical — it falls back
 * into the Tools catalogue alongside GRANT, Lumen and the rest. Since Tools
 * became super-admin only earlier the same day, the net effect is:
 *
 *   - **super-admin** — Job Fit is in the Tools section, as it was before it
 *     was ever promoted to My Workspace on 2026-08-04
 *   - **every other role** — no sidebar path at all. Nothing on Home or the
 *     Meridian header links to Job Fit either (checked: nothing outside the
 *     vertical references `ROUTES.JOB_FIT.*`), so for a plain user it is
 *     reachable only by URL, or by the vertical's own pill row once inside.
 *
 * Putting "job-fit" back in this set restores the My Workspace shortcut and
 * removes it from the Tools catalogue again — the two are mutually exclusive by
 * construction, which is the point of the filter.
 */
export const WORKSPACE_VERTICALS = new Set<VerticalKey>([])

/**
 * Verticals hidden from the Tools section entirely (2026-07-31).
 *
 * Honor Foundation is a client-specific workbench, not something a general user
 * should see listed. Unlike an unentitled vertical — which is deliberately shown
 * greyed so the catalogue stays legible — this one is withheld outright, so it
 * needs its own set rather than an entitlement change.
 */
export const HIDDEN_VERTICALS = new Set<VerticalKey>(["honor"])

/**
 * Verticals switched off for EVERYONE, regardless of entitlement.
 *
 * A third, independent mechanism, deliberately not folded into the other two:
 * `HIDDEN_VERTICALS` removes an entry from the list, entitlement decides whether
 * an entry you can see is usable, and this set overrides entitlement to force an
 * entry greyed even for a user who *is* entitled.
 *
 * **Empty as of 2026-08-11** (user request: give users real access to Job Fit
 * alongside Self-Portrait, Moments and Goals). Job Fit was the only member —
 * added 2026-08-04 when it was switched off beside Analytics and Goals — and
 * entitlement now decides it, like every other vertical. Entitlement rows were
 * seeded across all six roles in dev and staging-b in the same change, and the
 * `job-fit` gate is enforced server-side by blueprint-service, so an un-greyed
 * menu entry no longer implies an ungated backend.
 *
 * The mechanism is retained rather than deleted: it is the only lever that can
 * override entitlement, and switching a vertical off again is one word here.
 */
export const FORCE_DISABLED_VERTICALS = new Set<VerticalKey>([])

/**
 * Is this vertical switched off for everyone?
 *
 * Exported as a function rather than leaving callers to poke at the Set,
 * because the sidebar is not necessarily the only way into a vertical: any
 * surface that links straight to one and gates on entitlement alone must
 * consult this too, or greying the menu would look like the feature was off
 * while it was still one click away.
 *
 * Corrected 2026-08-12: this used to claim Home's quick-action row and the
 * Meridian header linked to Job Fit. Neither does on `development` — Home links
 * to Lumen's Self-Portrait and Moments, and nothing outside the Job Fit vertical
 * references `ROUTES.JOB_FIT.*` at all. The rule above still holds for Lumen;
 * it just is not currently load-bearing for Job Fit.
 *
 * Takes a plain string: the callers above hold `vertical` as an untyped string
 * from their own link tables, and making each one cast to `VerticalKey` would
 * be friction with no safety gained — an unknown key simply isn't in the set.
 */
export function isVerticalForceDisabled(key: string): boolean {
  return FORCE_DISABLED_VERTICALS.has(key as VerticalKey)
}

/** Per-vertical sidebar icon; the generic `Compass` is the fallback. */
const VERTICAL_ICONS: Partial<Record<VerticalKey, NavItemDef["icon"]>> = {
  "job-fit": Briefcase,
  lumen: Lightbulb,
  "direction-setting": Compass,
  grant: Wallet,
  "knowledge-continuity": BookOpen,
  honor: Award,
}

function toNavItem(
  v: { key: VerticalKey; title: string; homePath: string },
  entitled: boolean,
): NavItemDef {
  const forcedOff = FORCE_DISABLED_VERTICALS.has(v.key)
  return {
    to: v.homePath,
    icon: VERTICAL_ICONS[v.key] ?? Compass,
    label: v.title,
    disabled: forcedOff || !entitled,
    // An entitled-but-switched-off vertical must not claim it is missing from
    // the user's plan — that would be false. Unentitled entries keep the
    // default plan wording (see NavItemDef.disabledReason).
    ...(forcedOff && entitled
      ? { disabledReason: WORKSPACE_ITEM_UNAVAILABLE_REASON }
      : {}),
  }
}

/**
 * The **Tools** sidebar section — every registered vertical except the workspace
 * ones and the explicitly hidden ones, entitled or not. Never null: the
 * catalogue is the point.
 *
 * Renamed from "Verticals" on 2026-07-31 — "vertical" is our internal word for
 * how the product is partitioned; "Tools" is what the thing is from the user's
 * side. The section id is unchanged so stored collapse state survives the
 * rename.
 */
export function useVerticalLauncherSection(): SidebarSection | null {
  const { data: enabled } = useEnabledVerticals()
  return useMemo(() => {
    const entitlements = enabled ?? []
    const verticals = listVerticals().filter(
      (v) => !WORKSPACE_VERTICALS.has(v.key) && !HIDDEN_VERTICALS.has(v.key),
    )
    if (verticals.length === 0) return null
    return {
      id: "verticals-launcher",
      label: "Tools",
      // Rolled up by default: Tools is a catalogue you go looking for, not a
      // list you navigate by. The user can expand it and the choice persists.
      defaultCollapsed: true,
      roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
      items: verticals.map((v) => toNavItem(v, entitlements.includes(v.key))),
    }
  }, [enabled])
}

/**
 * Deep links into a vertical that belong in **My Workspace** on their own,
 * without dragging the rest of the vertical along.
 *
 * Different from {@link WORKSPACE_VERTICALS}, which promotes a vertical's HOME
 * page. These point at one page inside a vertical the user may not otherwise
 * see listed at all — Honor is in {@link HIDDEN_VERTICALS}, so its Resume Writer
 * would be unreachable from the sidebar without an entry like this.
 *
 * Each carries the vertical whose entitlement gates it. That matters: the honor
 * routes sit behind `VerticalShell`, which redirects an unentitled user to
 * /home. Shipping these as plain links would mean a menu row that looks live and
 * silently bounces, so they are greyed exactly like an unentitled vertical.
 *
 * **Empty as of 2026-08-12.** Resume Writer (Honor) was added here that morning
 * on request, then removed the same day when the user menu was fixed at six
 * entries that do not include it. Unlike Job Fit above, nothing is orphaned:
 * Honor's own shell still carries a "Résumé Writer" pill
 * (`src/pages/honor/HonorShell.tsx`) and `HonorEvaluate` navigates to it
 * directly, so Honor users reach it exactly as they did before it was ever
 * promoted.
 */
export const WORKSPACE_VERTICAL_LINKS: {
  to: string
  icon: NavItemDef["icon"]
  label: string
  vertical: VerticalKey
}[] = []

/**
 * {@link WORKSPACE_VERTICAL_LINKS} as nav items, greyed when the gating
 * vertical is not entitled (or is force-disabled for everyone).
 */
export function useWorkspaceVerticalLinks(): NavItemDef[] {
  const { data: enabled } = useEnabledVerticals()
  return useMemo(() => {
    const entitlements = enabled ?? []
    return WORKSPACE_VERTICAL_LINKS.map(({ vertical, ...item }) => {
      const forcedOff = FORCE_DISABLED_VERTICALS.has(vertical)
      const entitled = entitlements.includes(vertical)
      return {
        ...item,
        disabled: forcedOff || !entitled,
        ...(forcedOff && entitled
          ? { disabledReason: WORKSPACE_ITEM_UNAVAILABLE_REASON }
          : {}),
      }
    })
  }, [enabled])
}

/**
 * Workspace verticals (Job Fit, Lumen) as nav items, in registry order — shown
 * to everyone, `disabled` when the user has no entitlement. Consumers merge
 * these into the My Workspace menu — see {@link withWorkspaceVerticals}.
 */
export function useWorkspaceVerticalItems(): NavItemDef[] {
  const { data: enabled } = useEnabledVerticals()
  // Memoised on the entitlement list so the returned array keeps a stable
  // identity across renders — it feeds the `navSections` memo in every layout.
  return useMemo(() => {
    const entitlements = enabled ?? []
    return listVerticals()
      .filter((v) => WORKSPACE_VERTICALS.has(v.key))
      .map((v) => toNavItem(v, entitlements.includes(v.key)))
  }, [enabled])
}

/**
 * Labels that always sit at the BOTTOM of a workspace menu. Workspace verticals
 * are spliced in ahead of them so Settings/Help stay last, where users expect.
 *
 * "Document Library" joined the set on 2026-08-06, when it was moved to sit
 * directly above Settings. Without it here the splice landed between the two
 * (… Document Library · Job Fit · Settings …), which is not "directly above".
 * Membership is about menu POSITION, not about what kind of thing an entry is.
 */
const MENU_TAIL_LABELS = new Set([
  "Document Library",
  "Settings",
  "Help & Support",
])

/**
 * Merge workspace verticals into a menu, just above its Settings/Help tail — or
 * appended when the menu has no such tail. Idempotent: an item already present
 * by `to` is not duplicated. Returns the input array unchanged when there is
 * nothing to merge, so callers' memo identities stay stable.
 */
export function withWorkspaceVerticals(
  items: NavItemDef[],
  workspaceVerticals: NavItemDef[],
): NavItemDef[] {
  if (workspaceVerticals.length === 0) return items
  const present = new Set(items.map((i) => i.to))
  const extra = workspaceVerticals.filter((i) => !present.has(i.to))
  if (extra.length === 0) return items
  const tailAt = items.findIndex((i) => MENU_TAIL_LABELS.has(i.label))
  if (tailAt === -1) return [...items, ...extra]
  return [...items.slice(0, tailAt), ...extra, ...items.slice(tailAt)]
}

/**
 * A My Workspace menu with the workspace verticals (Job Fit, Lumen) spliced in
 * above Settings/Help.
 *
 * Used by every layout that renders a workspace menu — `UserLayout` and
 * `SuperAdminLayout` build theirs from `getUserNavItems()`, and
 * `useGatedNavItems` feeds each role's own menu through it for `UnifiedLayout`.
 */
export function useWorkspaceNavItems(items: NavItemDef[]): NavItemDef[] {
  const workspaceVerticals = useWorkspaceVerticalItems()
  // Deep links (Resume Writer) ride the same splice as the vertical homes, so
  // every layout that already called this hook gets them with no further wiring
  // — and they land above the Settings/Help tail like everything else.
  const workspaceLinks = useWorkspaceVerticalLinks()
  return useMemo(
    () =>
      withWorkspaceVerticals(items, [...workspaceVerticals, ...workspaceLinks]),
    [items, workspaceVerticals, workspaceLinks],
  )
}
