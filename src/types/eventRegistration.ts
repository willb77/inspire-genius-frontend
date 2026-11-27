import type { IntakeFieldProblem, PublicRegistrationPayload } from "@/types/intake"

/**
 * Public event registration (monorepo CSA `docs/analysis/2026-11-16-public-event-registration-csa.md`).
 * `GET /v1/intake/public/event-options` — exactly these five fields are read.
 * There is deliberately no capacity or count: a visitor learns only "full".
 */
export type EventOption = {
  id: string
  title: string
  /** UTC, ISO 8601. */
  starts_at: string
  time_zone: string
  full: boolean
}

/** The /join body, with a REQUIRED event and the Turnstile token. */
export type EventRegistrationPayload = Omit<PublicRegistrationPayload, "webinar_id"> & {
  webinar_id: string
  turnstile_token: string
  /** The page language, for the confirmation email only. Advisory: the server falls back to English. */
  language?: string
}

export type EventRegistrationFailure =
  | { kind: "not_open" }
  | { kind: "full" }
  | { kind: "bot_failed" }
  | { kind: "bot_unavailable" }
  | { kind: "rate_limited" }
  | { kind: "invalid"; problems: IntakeFieldProblem[] }
  | { kind: "too_large" }
  | { kind: "network" }
  | { kind: "server" }
