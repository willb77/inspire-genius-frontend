/**
 * PI-2 — a practitioner's view of their OWN PRISM registry row
 * (`GET /v1/agents/practitioner-registry/me`).
 *
 * Kept apart from `practitioner-registry.ts` (the super-admin shapes) on
 * purpose: this is a trimmed view with no email, sub or ExternalIdent.
 */
export type MyPracticeRegistration = {
  practitionerCode: string | null
  siteId: string
  clientId: string
  reference: string
  active: boolean
  deactivatedAt: string | null
}

/**
 * What the page renders from:
 * - `registered` — a row exists (it may be deactivated; check `active`);
 * - `missing` — the server has no row for this account (404);
 * - `dark` — the Practitioner Programme is switched off (403).
 */
export type MyPracticeState =
  | { state: "registered"; registration: MyPracticeRegistration }
  | { state: "missing" }
  | { state: "dark" }
