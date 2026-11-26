import type { DiscoveryJourney } from "@/types/career-discovery"
import { STAGE_ROUTES } from "@/pages/career-discovery/stageRoutes"
import { isProfileMerged, shownStage } from "./profileSection"

/**
 * The stage the "Next" card points at: the server's `nextAction`, or — with
 * Who I am folded into the profile section (JF-11) — the section it was folded
 * into. `null` when the server says nothing is next.
 */
export function nextStageOf(journey: DiscoveryJourney): { id: string; name: string; question: string } | null {
  // The type says nextAction is always an object; a payload without one is
  // treated as "nothing next" rather than a crash in the shell above every page.
  if (!journey.nextAction) return null
  const next = isProfileMerged(journey.stages) ? shownStage(journey.nextAction, journey.stages) : journey.nextAction
  if (!next.id) return null
  return { id: next.id, name: next.name, question: next.question }
}

/** Where the card's link goes, or `null` when there is no card. */
export function nextStageRoute(journey: DiscoveryJourney): string | null {
  const next = nextStageOf(journey)
  return next ? STAGE_ROUTES[next.id] ?? null : null
}
