// Student Oversight Phase 1 — the manager's consent-gated student roster.
//
// The types here encode the distinction the whole feature rests on:
//
//   NOT SHARED  — the student has not granted this category. We may hold the
//                 data; the manager may not see it.
//   NOT RECORDED — nobody holds the data. It was never measured.
//
// They render differently and mean opposite things. Collapsing them into one
// "—" tells a manager a student is disengaged when the student simply said no,
// which is the exact misreading the consent model exists to prevent. Hence
// `shared: false` as a discriminant rather than an optional field, so a
// component cannot forget to check it.

/** A block the viewer has no grant for. Carries no data, by construction. */
export type NotShared = { shared: false; reason: "not_shared" }

export type ConsentState =
  | "none"
  | "pending"
  | "granted"
  | "declined"
  | "revoked"
  | "expired"

export type RosterConsent = {
  state: ConsentState
  grantedCategories: string[]
  expiresAt: string | null
  requestedAt: string | null
  /** False while a request is outstanding — re-asking is how consent fatigue
   *  starts, and the backend enforces one live request per pair anyway. */
  canRequest: boolean
}

export type PrismState = "completed" | "in_progress" | "not_started"

export type RosterPrism = {
  state: PrismState
  at: string | null
  source: "prism_results" | "prism_requests" | null
  /** Populated when the platform's own sources disagree. Shown to the manager
   *  verbatim; never resolved silently in favour of one source. */
  disagreement: string | null
}

export type RosterEngagement = {
  lastLoginAt: string | null
  lastSeenAt: string | null
  loginCount: number | null
  /** `null` means never measured. `0` means measured and they did not come.
   *  These are different and must not both render as "0". */
  visitDays4w: number | null
  cadenceWindowDays: number
}

export type RosterAttention = {
  score: number
  /** Why this row ranks where it does. Shown on the row — a ranking a manager
   *  cannot interrogate steers them instead of informing them. */
  reasons: string[]
}

export type StudentRosterRow = {
  studentUserId: string
  name: string | null
  email: string | null
  consent: RosterConsent
  prism: RosterPrism | NotShared
  engagement: RosterEngagement | NotShared
  attention: RosterAttention
}

export type RosterEmptyReason = "no_profile" | "no_direct_reports" | null

export type StudentRoster = {
  students: StudentRosterRow[]
  /** Why the list is empty, when it is. "No students assigned to you" and
   *  "we could not resolve your profile" look identical on screen and need
   *  completely different actions from the person reading it. */
  rosterEmptyReason: RosterEmptyReason
  viewerProfileResolved: boolean
  counts?: { total: number; withAnyGrant: number }
}

export function isShared<T>(block: T | NotShared): block is T {
  return (block as NotShared)?.shared !== false
}
