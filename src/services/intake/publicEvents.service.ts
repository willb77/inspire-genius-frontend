import axios from "axios"
import type { PublicEvent, PublicEventsResult } from "@/types/publicEvents"
import { publicIntakeClient } from "./publicIntake.service"

/**
 * The public `/events` page's read. It goes through `publicIntakeClient` — the
 * dedicated, interceptor-free client the `/join` form uses — and never through
 * the shared `api` / `agentApi` instances, so an anonymous visitor sends no
 * token and a 404 or 401 can never bounce them to `/login`.
 */
export const PUBLIC_EVENTS_PATH = "/v1/intake/public/events"

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null
}

function nonEmpty(v: unknown): string | undefined {
  const s = str(v)?.trim()
  return s ? s : undefined
}

function count(v: unknown): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : undefined
}

/**
 * Build each event from an allowlist of four keys (plus four optional presentation keys). A row missing a title, a
 * start or a zone is dropped rather than shown half-empty. A body that is not
 * `{ events: [...] }` is an error, not an empty list.
 */
export function parsePublicEvents(data: unknown): PublicEvent[] {
  const events = (data as { events?: unknown } | null)?.events
  if (!Array.isArray(events)) throw new Error("Unexpected response from the events list")
  const out: PublicEvent[] = []
  for (const row of events) {
    if (typeof row !== "object" || row === null) continue
    const r = row as Record<string, unknown>
    const title = str(r.title)
    const startsAt = str(r.starts_at)
    const timeZone = str(r.time_zone)
    if (!title || !startsAt || !timeZone || Number.isNaN(Date.parse(startsAt))) continue
    const description = str(r.description)
    const event: PublicEvent = { title, starts_at: startsAt, time_zone: timeZone, description: description || null }
    // Optional presentation fields: kept only when well-formed, never defaulted.
    const presenterName = nonEmpty(r.presenter_name)
    const presenterRole = nonEmpty(r.presenter_role)
    const minutes = count(r.duration_minutes)
    const seats = count(r.seats_left)
    if (presenterName) event.presenter_name = presenterName
    if (presenterRole) event.presenter_role = presenterRole
    if (minutes) event.duration_minutes = minutes
    if (seats !== undefined) event.seats_left = seats
    out.push(event)
  }
  return out
}

/** 404 → `not_open` (switch off). Any other failure throws, for the page's error state. */
export async function fetchPublicEvents(): Promise<PublicEventsResult> {
  try {
    const { data } = await publicIntakeClient.get<unknown>(PUBLIC_EVENTS_PATH)
    return { kind: "list", events: parsePublicEvents(data) }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return { kind: "not_open" }
    throw err
  }
}
