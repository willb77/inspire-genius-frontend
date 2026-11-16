import axios from "axios"
import type {
  EventOption,
  EventRegistrationFailure,
  EventRegistrationPayload,
} from "@/types/eventRegistration"
import type { IntakeFieldProblem, PublicRegistrationReceived } from "@/types/intake"
import { publicIntakeClient } from "./publicIntake.service"

/**
 * Public event registration, through the same interceptor-free client `/join`
 * and `/events` use, so an anonymous visitor sends no token and a 404 or 403 can
 * never bounce them to `/login`.
 */
export const EVENT_OPTIONS_PATH = "/v1/intake/public/event-options"
export const EVENT_REGISTRATIONS_PATH = "/v1/intake/public/event-registrations"

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null)

/** Allowlist of five keys; a malformed row is dropped, a malformed body is an empty list. */
export function parseEventOptions(data: unknown): EventOption[] {
  const events = (data as { events?: unknown } | null)?.events
  if (!Array.isArray(events)) return []
  const out: EventOption[] = []
  for (const row of events) {
    if (typeof row !== "object" || row === null) continue
    const r = row as Record<string, unknown>
    const id = str(r.id)
    const title = str(r.title)
    const startsAt = str(r.starts_at)
    const timeZone = str(r.time_zone)
    if (!id || !title || !startsAt || !timeZone || Number.isNaN(Date.parse(startsAt))) continue
    out.push({ id, title, starts_at: startsAt, time_zone: timeZone, full: r.full === true })
  }
  return out
}

/**
 * Anything that goes wrong reading the options is "no registration offered":
 * the events list itself must never be affected by this second, separately
 * switched route (404 = switch off; a network or server error is the same here).
 */
export async function fetchEventOptions(): Promise<EventOption[]> {
  try {
    const { data } = await publicIntakeClient.get<unknown>(EVENT_OPTIONS_PATH)
    return parseEventOptions(data)
  } catch {
    return []
  }
}

export async function submitEventRegistration(payload: EventRegistrationPayload): Promise<PublicRegistrationReceived> {
  const { data } = await publicIntakeClient.post<PublicRegistrationReceived>(EVENT_REGISTRATIONS_PATH, payload)
  return data
}

function isProblem(v: unknown): v is IntakeFieldProblem {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { field?: unknown }).field === "string" &&
    typeof (v as { message?: unknown }).message === "string"
  )
}

/** Map anything the submit can throw to one state the dialog renders. */
export function classifyEventRegistrationError(err: unknown): EventRegistrationFailure {
  if (!axios.isAxiosError(err)) return { kind: "server" }
  const status = err.response?.status
  if (status === undefined) return { kind: "network" }
  if (status === 404) return { kind: "not_open" }
  if (status === 409) return { kind: "full" }
  if (status === 403) return { kind: "bot_failed" }
  if (status === 503) return { kind: "bot_unavailable" }
  if (status === 429) return { kind: "rate_limited" }
  if (status === 413) return { kind: "too_large" }
  if (status === 422) {
    const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail
    return { kind: "invalid", problems: Array.isArray(detail) ? detail.filter(isProblem) : [] }
  }
  return { kind: "server" }
}
