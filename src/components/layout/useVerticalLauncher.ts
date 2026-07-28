import { useMemo } from "react"
import { Briefcase, Compass, Lightbulb } from "lucide-react"
import {
  listEntitledVerticals,
  useEnabledVerticals,
  type VerticalKey,
} from "@/verticals/core"
import type { SidebarSection } from "@/constants/sidebar-sections"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"

/**
 * Registry-driven vertical launcher.
 *
 * Replaces per-vertical hardcoded sidebar wiring: instead of each layout
 * appending a bespoke section for GRANT/HONOR/…, the launcher reads the user's
 * entitled verticals straight from the Core registry
 * (`listEntitledVerticals(enabled_verticals)`) and renders one entry link per
 * vertical → its `homePath`. Registering a new vertical's manifest surfaces it
 * everywhere the launcher is mounted — no sidebar edit needed.
 *
 * Verticals that ship their OWN detailed sidebar sub-nav (currently just GRANT,
 * with 9 aid pages) are excluded here so they aren't double-listed; they keep
 * their richer section. Themed verticals (Honor, Summit-style) whose sub-nav
 * lives in their own shell appear as a single launcher link.
 */
const DETAILED_VERTICALS = new Set<VerticalKey>(["grant", "knowledge-continuity"])

/**
 * Verticals that belong in **My Workspace** rather than the collapsed
 * "Verticals" launcher section.
 *
 * Job Fit and Lumen are first-person surfaces — the signed-in user working on
 * their OWN profile — so they read as everyday workspace tools next to Goal
 * Setting and My Documents, not as a separate product the user launches into.
 * They are excluded from the launcher here and re-surfaced by
 * `useWorkspaceVerticalItems` (see `@/hooks/nav/useGatedNavItems`).
 */
export const WORKSPACE_VERTICALS = new Set<VerticalKey>(["job-fit", "lumen"])

/** Per-vertical sidebar icon; the generic `Compass` is the launcher fallback. */
const WORKSPACE_VERTICAL_ICONS: Partial<Record<VerticalKey, NavItemDef["icon"]>> = {
  "job-fit": Briefcase,
  lumen: Lightbulb,
}

/** The launcher sidebar section, or null when the user has no launcher-eligible vertical. */
export function useVerticalLauncherSection(): SidebarSection | null {
  const { data: enabled } = useEnabledVerticals()
  const verticals = listEntitledVerticals(enabled ?? []).filter(
    (v) => !DETAILED_VERTICALS.has(v.key) && !WORKSPACE_VERTICALS.has(v.key)
  )
  if (verticals.length === 0) return null
  return {
    id: "verticals-launcher",
    label: "Verticals",
    roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
    items: verticals.map((v) => ({ to: v.homePath, icon: Compass, label: v.title })),
  }
}

/**
 * Entitled workspace verticals (Job Fit, Lumen) as plain nav items, in registry
 * order. Empty when the user is entitled to neither. Consumers merge these into
 * the My Workspace menu — see `withWorkspaceVerticals`.
 */
export function useWorkspaceVerticalItems(): NavItemDef[] {
  const { data: enabled } = useEnabledVerticals()
  // Memoised on the entitlement list so the returned array keeps a stable
  // identity across renders — it feeds the `navSections` memo in every layout.
  return useMemo(
    () =>
      listEntitledVerticals(enabled ?? [])
        .filter((v) => WORKSPACE_VERTICALS.has(v.key))
        .map((v) => ({
          to: v.homePath,
          icon: WORKSPACE_VERTICAL_ICONS[v.key] ?? Compass,
          label: v.title,
        })),
    [enabled],
  )
}

/**
 * Labels that always sit at the BOTTOM of a workspace menu. Workspace verticals
 * are spliced in ahead of them so Settings/Help stay last, where users expect.
 */
const MENU_TAIL_LABELS = new Set(["Settings", "Help & Support"])

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
 * A My Workspace menu with the user's entitled workspace verticals (Job Fit,
 * Lumen) spliced in above Settings/Help.
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
