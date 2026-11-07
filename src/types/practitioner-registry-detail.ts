/**
 * GET /v1/agents/practitioner-registry/{sub}/detail — the S2 drawer's counts (PI-6, partial).
 *
 * Counts only: the route returns no client identities. Open client invites are
 * not here yet — they need PI-3's invite table.
 */
export type PractitionerDetail = {
  practitionerSub: string
  active: boolean
  /** Distinct client accounts live-linked to this practitioner. */
  linkedClients: number
  /** PRISM surveys raised on this practitioner's Site ID in the last `surveyWindowDays` days. */
  surveysOnSite30d: number
  surveyWindowDays: number
}
