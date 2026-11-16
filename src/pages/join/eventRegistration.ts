import type { EventOption, EventRegistrationFailure } from "@/types/eventRegistration"
import type { PublicEvent } from "@/types/publicEvents"

// Plain module (not a component file) so the components stay fast-refresh friendly.

export const EVENT_REG_MESSAGES: Record<Exclude<EventRegistrationFailure["kind"], "invalid" | "not_open">, string> = {
  full: "Sorry, this event has just filled up.",
  bot_failed: "The security check did not pass. Please try again.",
  bot_unavailable: "The security check is unavailable right now. Please try again in a few minutes.",
  rate_limited: "There have been too many submissions from your connection. Please try again later.",
  too_large: "That submission was too long to send. Please shorten your answers and try again.",
  network: "We couldn't reach the server. Check your connection and try again.",
  server: "Something went wrong on our side. Please try again in a few minutes.",
}
export const EVENT_REG_NOT_OPEN = "Registration for events isn't open right now."
export const EVENT_REG_NO_CHECK = "Registration is not available right now."

/** "Ada Lovelace" → ["Ada", "Lovelace"]; one word → first name only. */
export function splitName(full: string | null | undefined): [string, string] {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean)
  return parts.length === 0 ? ["", ""] : [parts[0], parts.slice(1).join(" ")]
}

/**
 * The registration option for a listed event. The public list carries no id, so an
 * option matches by title and start. No match (switch off, event not offered, a
 * race) means no button: the list is exactly what it was before registration existed.
 */
export function optionFor(event: PublicEvent, options: EventOption[] | undefined): EventOption | undefined {
  return options?.find((o) => o.title === event.title && Date.parse(o.starts_at) === Date.parse(event.starts_at))
}

