import { Compass } from "lucide-react"
import {
  listEntitledVerticals,
  useEnabledVerticals,
  type VerticalKey,
} from "@/verticals/core"
import type { SidebarSection } from "@/constants/sidebar-sections"

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
const DETAILED_VERTICALS = new Set<VerticalKey>(["grant"])

/** The launcher sidebar section, or null when the user has no launcher-eligible vertical. */
export function useVerticalLauncherSection(): SidebarSection | null {
  const { data: enabled } = useEnabledVerticals()
  const verticals = listEntitledVerticals(enabled ?? []).filter(
    (v) => !DETAILED_VERTICALS.has(v.key)
  )
  if (verticals.length === 0) return null
  return {
    id: "verticals-launcher",
    label: "Verticals",
    roles: ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"],
    items: verticals.map((v) => ({ to: v.homePath, icon: Compass, label: v.title })),
  }
}
