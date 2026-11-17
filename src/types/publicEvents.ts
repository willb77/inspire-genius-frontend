/**
 * The public events list, `GET /v1/intake/public/events` (monorepo CSA
 * `docs/analysis/2026-11-10-public-events-list-csa.md` §2). Exactly these four
 * fields are read (plus the optional presentation fields below); anything else
 * the server might send is dropped.
 */
export type PublicEvent = {
  title: string
  /** UTC, ISO 8601. */
  starts_at: string
  /** IANA name; the time is shown in this zone. */
  time_zone: string
  /** Plain text written for the public, or null. Never rendered as HTML. */
  description: string | null
  /**
   * Optional presentation fields. The server does not send them today (the list
   * route returns the four fields above); they are read if it ever does, and
   * everything that shows them renders nothing when they are missing.
   */
  presenter_name?: string
  presenter_role?: string
  duration_minutes?: number
  /** Never sent today: the registration CSA deliberately exposes only "full". */
  seats_left?: number | null
}

/**
 * `list` — the switch is on (the list may be empty).
 * `not_open` — the route answered 404: the switch is off, or the service
 * predates the route. The page then looks exactly like the old stub.
 */
export type PublicEventsResult = { kind: "list"; events: PublicEvent[] } | { kind: "not_open" }
