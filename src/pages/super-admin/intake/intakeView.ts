/**
 * Pure helpers for the Intake page: URL ↔ filters, time-zone display, the
 * registrations CSV, and segment summaries. No React, so each is tested alone.
 */
import { ROLE_LABELS, SEGMENT_CONTEXT_LABELS, SEGMENT_STATUS_LABELS } from "@/constants/intake"
import {
  INTAKE_ROLES,
  SEGMENT_CONTEXTS,
  SEGMENT_STATUSES,
  type IntakeRole,
  type Registrant,
  type RegistrationFilters,
  type Segment,
  type SegmentContext,
  type SegmentStatus,
} from "@/types/intake"

export const PAGE_SIZE = 50
export const DAY_OPTIONS = [7, 30, 90] as const
export type ReviewFilter = "" | "needs" | "reviewed"

/** What the Registrations tab shows, as read from the URL. Unknown values are dropped, never guessed. */
export type ListView = {
  segment_status: SegmentStatus | ""
  segment_context: SegmentContext | ""
  role: IntakeRole[]
  review: ReviewFilter
  days: number | null
  q: string
  page: number
}

const isOneOf = <T extends string>(list: readonly T[], v: string | null): v is T => v !== null && list.includes(v as T)

export function viewFromSearch(sp: URLSearchParams): ListView {
  const status = sp.get("segment_status")
  const context = sp.get("segment_context")
  const review = sp.get("review")
  const days = Number(sp.get("days"))
  const page = Number(sp.get("page"))
  return {
    segment_status: isOneOf(SEGMENT_STATUSES, status) ? status : "",
    segment_context: isOneOf(SEGMENT_CONTEXTS, context) ? context : "",
    role: sp.getAll("role").filter((r): r is IntakeRole => isOneOf(INTAKE_ROLES, r)),
    review: review === "needs" || review === "reviewed" ? review : "",
    days: (DAY_OPTIONS as readonly number[]).includes(days) ? days : null,
    q: sp.get("q") ?? "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

/** The URL for a view. Keeps `tab` and any other key it does not own. */
export function searchFromView(view: ListView, base: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(base)
  for (const k of ["segment_status", "segment_context", "role", "review", "days", "q", "page"]) p.delete(k)
  if (view.segment_status) p.set("segment_status", view.segment_status)
  if (view.segment_context) p.set("segment_context", view.segment_context)
  for (const r of view.role) p.append("role", r)
  if (view.review) p.set("review", view.review)
  if (view.days) p.set("days", String(view.days))
  if (view.q.trim()) p.set("q", view.q.trim())
  if (view.page > 1) p.set("page", String(view.page))
  return p
}

/** The API filters for a view. `now` is injectable so the date window is testable. */
export function filtersFromView(view: ListView, now: Date = new Date()): RegistrationFilters {
  const f: RegistrationFilters = {}
  if (view.segment_status) f.segment_status = view.segment_status
  if (view.segment_context) f.segment_context = view.segment_context
  if (view.role.length) f.role = [...view.role]
  if (view.review === "needs") f.needs_review = true
  if (view.review === "reviewed") f.needs_review = false
  if (view.days) {
    // Start of the day, N days back, so the window does not slide every render
    // (a new millisecond each time would be a new query key and a refetch loop).
    const from = new Date(now)
    from.setUTCHours(0, 0, 0, 0)
    from.setUTCDate(from.getUTCDate() - view.days)
    f.created_from = from.toISOString()
  }
  if (view.q.trim()) f.q = view.q.trim()
  return f
}

// ─── Segments ─────────────────────────────────────────────────────────

export function segmentLabel(status: SegmentStatus, context: SegmentContext): string {
  return `${SEGMENT_STATUS_LABELS[status]} · ${SEGMENT_CONTEXT_LABELS[context]}`
}

/** "All 4 InspiresGenius segments" when a whole row of the grid is ticked, else one label per cell. */
export function segmentSummary(segments: Segment[]): string[] {
  const out: string[] = []
  for (const status of SEGMENT_STATUSES) {
    const contexts = segments.filter((s) => s.segment_status === status).map((s) => s.segment_context)
    if (contexts.length === SEGMENT_CONTEXTS.length) {
      out.push(`All ${SEGMENT_CONTEXTS.length} ${SEGMENT_STATUS_LABELS[status]} segments`)
    } else {
      for (const context of SEGMENT_CONTEXTS) if (contexts.includes(context)) out.push(segmentLabel(status, context))
    }
  }
  return out
}

export const segmentKey = (s: Segment) => `${s.segment_status}:${s.segment_context}`

// ─── Time zones ───────────────────────────────────────────────────────

const FALLBACK_ZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
]

/** IANA zones the browser knows, or a short list where it cannot say. The server validates either way. */
export function timeZoneOptions(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }
  const all = typeof intl.supportedValuesOf === "function" ? intl.supportedValuesOf("timeZone") : []
  return all.length ? Array.from(new Set(["UTC", ...all])) : FALLBACK_ZONES
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

/** A UTC instant as `YYYY-MM-DDTHH:mm` wall-clock time in `timeZone` — what a datetime-local input holds. */
export function toZonedInput(utcIso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcIso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}

/** "Tue 18 Nov 2026, 14:00 EST" in the session's own zone. */
export function formatInZone(utcIso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(utcIso))
  } catch {
    return utcIso
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// ─── CSV ──────────────────────────────────────────────────────────────

export const REGISTRATION_CSV_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "organisation",
  "role",
  "role_other",
  "prism_accredited",
  "site_id",
  "context",
  "context_other",
  "region",
  "country",
  "heard_from",
  "segment_status",
  "segment_context",
  "needs_review",
  "created_at",
  "confirmed_at",
] as const satisfies readonly (keyof Registrant)[]

/**
 * One CSV cell. Quoted when it must be, and a leading `= + - @` (or tab / CR)
 * is defused with `'` — these values come from a public form, and a
 * spreadsheet would otherwise run them as formulas.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  let text = typeof value === "boolean" ? (value ? "yes" : "no") : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function registrationsCsv(rows: Registrant[]): string {
  const lines = [REGISTRATION_CSV_COLUMNS.join(",")]
  for (const row of rows) lines.push(REGISTRATION_CSV_COLUMNS.map((c) => csvCell(row[c])).join(","))
  return lines.join("\r\n") + "\r\n"
}

export function roleLabel(role: IntakeRole, other?: string | null): string {
  return role === "other" && other ? `Other: ${other}` : ROLE_LABELS[role]
}

/** Save a Blob as a file. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
