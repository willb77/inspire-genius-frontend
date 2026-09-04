/**
 * Student visibility consent — the subject's side (Goals offering, Phase 2–3).
 *
 * Mirrors `services/agent-engine/app/consent/` (routes under
 * `/v1/agents/consent/visibility`). Every response is the `ok()` envelope.
 * Timestamps are ISO strings; categories are a boolean map over the six
 * visibility categories — absent means false, and `safety` is never one.
 */

export type VisibilityCategory =
  | "prism"
  | "engagement"
  | "topics"
  | "artefacts"
  | "goals"
  | "assessments"

export type VisibilityCategories = Partial<Record<VisibilityCategory, boolean>>

export type GrantStatus = "pending" | "granted" | "declined" | "revoked" | "expired"

/** How a person on the list relates to the subject. A person can have several. */
export type PersonKind = "manager_of_record" | "roster_manager" | "practitioner" | "requester"

/** The live (pending/granted) row for a person, else their newest row. */
export type PersonGrantState = {
  id: string
  status: GrantStatus
  categories: VisibilityCategories
  expiresAt: string | null
  requestedAt: string | null
}

export type VisibilityPerson = {
  userId: string
  displayName: string
  email: string | null
  kinds: PersonKind[]
  grant: PersonGrantState | null
}

/** Each candidate source is read separately and reported honestly. */
export type PeopleSourceState = "ok" | "unavailable"

export type PeopleResponse = {
  people: VisibilityPerson[]
  sources: Record<string, PeopleSourceState>
}

export type LookupResult = { userId: string; displayName: string; email: string | null }

/** One row of GET /my-grants — everything the subject can see about who can see them. */
export type MyGrantRow = {
  id: string
  grantee_user_id: string
  categories: VisibilityCategories | string
  reason: string | null
  status: GrantStatus
  access_basis: string
  consent_holder: string
  requested_at: string | null
  responded_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

export type OfferResult = {
  id: string
  status: "granted"
  categories: Record<VisibilityCategory, boolean>
  expires_at: string
  /** offered = new row; answered = a pending request was accepted; refreshed = an existing grant was renewed. */
  mode: "offered" | "answered" | "refreshed"
}

export type ExtendResult = { id: string; status: "granted"; expires_at: string }
