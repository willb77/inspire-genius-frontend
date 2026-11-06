/**
 * Intake — types for both intake surfaces.
 *
 * 1. IN-2c, the public "Register your interest" form at `/join`, which mirrors
 *    the public registration contract (`POST /v1/intake/public/registrations`).
 * 2. IN-3, the super-admin Intake page (registrations and webinar sessions),
 *    which mirrors the service's admin responses. Those return raw JSON, not the
 *    `BaseApiResponse<T>` envelope, like client-signup and broadcast.
 *
 * The vocabularies are the server's; a value outside them is refused there with
 * a 422, so they are kept in step by hand and covered by each page's tests.
 * `INTAKE_ROLES` / `IntakeRole` are shared by both surfaces and defined once.
 */

export const INTAKE_ROLES = [
  "practitioner",
  "distributor",
  "career_coach",
  "education_coach",
  "mentor",
  "hr",
  "recruiter",
  "company",
  "other",
] as const
export type IntakeRole = (typeof INTAKE_ROLES)[number]

export const INTAKE_PRISM_ACCREDITED = ["yes", "no", "not_sure"] as const
export type IntakePrismAccredited = (typeof INTAKE_PRISM_ACCREDITED)[number]

export const INTAKE_CONTEXTS = ["individual", "company", "education", "other"] as const
export type IntakeContext = (typeof INTAKE_CONTEXTS)[number]

export const INTAKE_CONSENT_PURPOSES = ["webinar_email", "mailing_list"] as const
export type IntakeConsentPurpose = (typeof INTAKE_CONSENT_PURPOSES)[number]

export type IntakeConsent = {
  purpose: IntakeConsentPurpose
  granted: boolean
  /** The exact wording the visitor saw next to the checkbox. */
  wording: string
  form_version: string
}

/**
 * The browser-mode body. There is deliberately no `client_ip` (the server
 * takes it from the request) and `webinar_id` is always `null` (register
 * interest only; there is no session picker).
 */
export type PublicRegistrationPayload = {
  first_name: string
  last_name: string
  email: string
  phone: string | null
  organisation: string | null
  role: IntakeRole
  role_other: string | null
  prism_accredited: IntakePrismAccredited
  site_id: string | null
  context: IntakeContext
  context_other: string | null
  region: string
  country: string
  heard_from: string | null
  webinar_id: null
  consents: IntakeConsent[]
  /** Honeypot. A person never sees it, so it is empty unless a bot filled it. */
  website: string | null
}

export type PublicRegistrationReceived = { status: "received" }

/** One entry of the server's 422 list. `field` may be dotted, e.g. `consents.0.granted`. */
export type IntakeFieldProblem = { field: string; message: string }

export type PublicRegistrationFailure =
  | { kind: "not_open" }
  | { kind: "rate_limited" }
  | { kind: "invalid"; problems: IntakeFieldProblem[] }
  | { kind: "too_large" }
  | { kind: "network" }
  | { kind: "server" }

// ─── Super-admin Intake page (IN-3) ───────────────────────────────────

export const SEGMENT_STATUSES = ["inspiresgenius", "non_inspiresgenius"] as const
export type SegmentStatus = (typeof SEGMENT_STATUSES)[number]

export const SEGMENT_CONTEXTS = ["individual", "company", "education", "other"] as const
export type SegmentContext = (typeof SEGMENT_CONTEXTS)[number]

export type WebinarStatus = "scheduled" | "cancelled" | "completed"
export type AttendanceStatus = "registered" | "attended" | "no_show"

export type Segment = { segment_status: SegmentStatus; segment_context: SegmentContext }

export type Registrant = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  organisation: string | null
  role: IntakeRole
  role_other: string | null
  prism_accredited: "yes" | "no" | "not_sure"
  site_id: string | null
  context: SegmentContext
  context_other: string | null
  region: string
  country: string
  heard_from: string | null
  segment_status: SegmentStatus
  segment_context: SegmentContext
  needs_review: boolean
  created_at: string | null
  confirmed_at: string | null
}

export type RegistrantConsent = {
  id: string
  purpose: "webinar_email" | "mailing_list"
  granted: boolean
  wording: string
  form_version: string
  created_at: string | null
}

export type RegistrantWebinar = {
  id: string
  /** null = "none of these times work for me". */
  webinar_id: string | null
  webinar_title: string | null
  webinar_starts_at: string | null
  status: AttendanceStatus
  created_at: string | null
}

export type RegistrantDetail = Registrant & {
  consents: RegistrantConsent[]
  webinar_registrations: RegistrantWebinar[]
}

export type RegistrationPage = {
  items: Registrant[]
  total: number
  limit: number
  offset: number
}

/** Query filters for `GET /v1/intake/admin/registrations`. Absent = no filter. */
export type RegistrationFilters = {
  segment_status?: SegmentStatus
  segment_context?: SegmentContext
  role?: IntakeRole[]
  needs_review?: boolean
  created_from?: string
  created_to?: string
  q?: string
}

export type Webinar = {
  id: string
  title: string
  /** UTC, ISO 8601. */
  starts_at: string
  /** IANA name; the session's own zone, used for display. */
  time_zone: string
  capacity: number
  join_link: string | null
  status: WebinarStatus
  created_by: string
  created_at: string | null
  updated_at: string | null
  /** Every registration for the session, whatever its status. */
  registered_count: number
  segments: Segment[]
}

export type WebinarList = {
  items: Webinar[]
  /** Registrants who answered "none of these times work". */
  none_of_these_times_count: number
}

/**
 * Create / update body. `starts_at` without an offset is wall-clock time in
 * `time_zone`; the server stores it in UTC.
 */
export type WebinarInput = {
  title: string
  starts_at: string
  time_zone: string
  capacity: number
  join_link: string | null
  segments: Segment[]
  status?: WebinarStatus
}

export type SessionListItem = {
  id: string
  registrant_id: string
  first_name: string
  last_name: string
  email: string
  organisation: string | null
  role: IntakeRole
  segment_status: SegmentStatus
  segment_context: SegmentContext
  needs_review: boolean
  status: AttendanceStatus
  registered_at: string | null
}

export type SessionList = {
  webinar: Webinar
  items: SessionListItem[]
  counts: Record<AttendanceStatus, number>
}

export type AttendanceInput = {
  webinarId: string
  registrationIds: string[]
  status: Exclude<AttendanceStatus, "registered">
}

/** A refused write lists every problem: `{"detail": [{field, message}]}`. */
export type IntakeProblem = { field: string; message: string }
