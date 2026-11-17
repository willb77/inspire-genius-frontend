import type { PublicEvent } from "@/types/publicEvents"

// Plain module (not a component file) so the components stay fast-refresh friendly.

/**
 * The fixed host shown on every session tile: the owner's copy, "Hosted by Mark Tully, PRISM
 * Practitioner" (typed 2026-11-17). The events data has no presenter fields; a session that carries
 * its own `presenter_name` / `presenter_role` shows those instead.
 */
export const DEFAULT_HOST = { name: "Mark Tully", role: "PRISM Practitioner" } as const

/** One listed event, seen as a session of the event with its title. */
export type EventSession = PublicEvent

/** The sessions that share an exact title; `sessions` is sorted by start, earliest first. */
export type EventGroup = { title: string; sessions: EventSession[] }

/**
 * The public list has no "event with several sessions": each row stands alone. A
 * session is a row, and rows with the same EXACT title belong to one event (Bill,
 * 2026-11-17: group by exact title, one card per title). Sessions whose start has
 * passed are dropped; a group left with none is dropped. Groups are ordered by
 * their earliest session. A "same event" guess any looser than exact equality
 * would merge two different events, so none is made.
 */
export function groupSessions(events: EventSession[], now: number = Date.now()): EventGroup[] {
  const byTitle = new Map<string, EventSession[]>()
  for (const e of events) {
    if (Date.parse(e.starts_at) <= now) continue
    const list = byTitle.get(e.title)
    if (list) list.push(e)
    else byTitle.set(e.title, [e])
  }
  const groups: EventGroup[] = []
  for (const [title, sessions] of byTitle) {
    sessions.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    groups.push({ title, sessions })
  }
  groups.sort((a, b) => Date.parse(a.sessions[0].starts_at) - Date.parse(b.sessions[0].starts_at))
  return groups
}

/** Start instants only: two rows at the same instant are still two sessions. */
export function sessionKey(session: EventSession, index: number): string {
  return `${index}-${session.starts_at}`
}

/** The viewer's own zone when `viewerZone` is omitted; an unknown zone falls back to it too. */
function viewer(
  startsAt: string,
  options: Intl.DateTimeFormatOptions,
  viewerZone: string | undefined,
  locale: string | undefined,
): string {
  const when = new Date(startsAt)
  try {
    return new Intl.DateTimeFormat(locale, { ...options, ...(viewerZone ? { timeZone: viewerZone } : {}) }).format(when)
  } catch {
    return new Intl.DateTimeFormat(locale, options).format(when)
  }
}

/** "Tue, Dec 8", in the viewer's zone. */
export function sessionDay(startsAt: string, viewerZone?: string, locale?: string): string {
  return viewer(startsAt, { weekday: "short", month: "short", day: "numeric" }, viewerZone, locale)
}

/** "10:00 AM", in the viewer's zone (no zone name: the header names it once). */
export function sessionLocalTime(startsAt: string, viewerZone?: string, locale?: string): string {
  return viewer(startsAt, { hour: "numeric", minute: "2-digit" }, viewerZone, locale)
}

/** The viewer's zone abbreviation for this instant ("EST", "GMT+1"); "" if it cannot be named. */
export function viewerZoneAbbreviation(at: string | number | Date = Date.now(), viewerZone?: string, locale?: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZoneName: "short",
      ...(viewerZone ? { timeZone: viewerZone } : {}),
    }).formatToParts(new Date(at))
    return parts.find((p) => p.type === "timeZoneName")?.value ?? ""
  } catch {
    return ""
  }
}
