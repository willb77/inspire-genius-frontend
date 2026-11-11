import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import { ROUTES } from "@/constants/routes"
import type { DiscoveryStage } from "@/types/career-discovery"

/**
 * JF-11 — About me and Who I am as ONE profile section.
 *
 * The browser does not read the `job_fit_v2` switch itself: the server marks
 * the stage list (the "who" stage carries `mergedInto: "about"`) only when the
 * switch applies to this person. No mark — loading, an error, switch off — and
 * every menu and page renders exactly as before.
 */
export const PROFILE_LABEL = "My profile"

export function isProfileMerged(stages: readonly DiscoveryStage[] | undefined | null): boolean {
  return (stages ?? []).some((s) => s.id === "who" && s.mergedInto === "about")
}

/** The stages a person sees as entries: a stage folded into another is hidden. */
export function visibleStages(stages: readonly DiscoveryStage[]): DiscoveryStage[] {
  return stages.filter((s) => !s.mergedInto)
}

/** The stage to show for `stage`: itself, or the section it was folded into. */
export function shownStage<T extends DiscoveryStage>(stage: T, stages: readonly DiscoveryStage[]): T | DiscoveryStage {
  if (!stage.mergedInto) return stage
  return stages.find((s) => s.id === stage.mergedInto) ?? stage
}

/** The Discovery menu: unchanged, or with Who folded into one "My profile" entry. */
export function discoveryMenu(items: NavItemDef[], merged: boolean): NavItemDef[] {
  if (!merged) return items
  return items
    .filter((i) => i.to !== ROUTES.CAREER_DISCOVERY.WHO)
    .map((i) => (i.to === ROUTES.CAREER_DISCOVERY.ABOUT ? { ...i, label: PROFILE_LABEL } : i))
}
