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
 * it now shows as a top-level "Job Fit" shortcut (spliced above Settings/Help)
 * and drops out of the Tools rollup below, which filters `WORKSPACE_VERTICALS`.
 */
export const WORKSPACE_VERTICALS = new Set<VerticalKey>(["job-fit"])

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
 * because the sidebar is NOT the only way into a vertical: Home's quick-action
 * row and the Meridian header's personal row link straight to Job Fit, and both
 * gate on entitlement alone. Greying the menu while those stayed live would look
 * like the feature was off when it was still one click away. Any surface that
 * decides whether a vertical is usable must consult this too.
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
  return useMemo(
    () => withWorkspaceVerticals(items, workspaceVerticals),
    [items, workspaceVerticals],
  )
}
