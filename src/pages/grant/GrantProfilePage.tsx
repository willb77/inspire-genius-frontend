import GrantIntakeFlow from "./intake/GrantIntakeFlow"

/**
 * Financial Profile = the interactive aid-intake flow (UI-1).
 *
 * The static wireframe had no intake surface; this replaces the stub with the
 * hybrid conversational + structured questionnaire that collects the five
 * trigger fields (plus enrichment) the Targeted Search Module needs.
 */
export default function GrantProfilePage() {
  return <GrantIntakeFlow />
}
