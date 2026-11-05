/**
 * IN-2c — the public "Register your interest" form at `/join`.
 *
 * These mirror the intake service's public registration contract
 * (`POST /v1/intake/public/registrations`). The vocabularies are the server's;
 * a value outside them is refused there with a 422, so they are kept in step by
 * hand and covered by the page's tests.
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
