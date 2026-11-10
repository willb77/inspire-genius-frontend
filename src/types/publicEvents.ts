/**
 * The public events list, `GET /v1/intake/public/events` (monorepo CSA
 * `docs/analysis/2026-11-10-public-events-list-csa.md` §2). Exactly these four
 * fields are read; anything else the server might send is dropped.
 */
export type PublicEvent = {
  title: string
  /** UTC, ISO 8601. */
  starts_at: string
  /** IANA name; the time is shown in this zone. */
  time_zone: string
  /** Plain text written for the public, or null. Never rendered as HTML. */
  description: string | null
}

/**
 * `list` — the switch is on (the list may be empty).
 * `not_open` — the route answered 404: the switch is off, or the service
 * predates the route. The page then looks exactly like the old stub.
 */
export type PublicEventsResult = { kind: "list"; events: PublicEvent[] } | { kind: "not_open" }
