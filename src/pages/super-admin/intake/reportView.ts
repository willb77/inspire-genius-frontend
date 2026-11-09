/**
 * Pure helpers for the Intake Reports tab (IN-7): URL ↔ report filters, and
 * the bar widths. No React, so each is tested alone.
 *
 * The URL is the filter, as on the Registrations tab, and the two tabs share
 * `segment_status`, `segment_context` and `role` — so a menu preset (HR,
 * Coaches, …) narrows whichever tab is open, and switching tabs keeps it.
 */
import {
  INTAKE_PRISM_ACCREDITED,
  INTAKE_ROLES,
  SEGMENT_CONTEXTS,
  SEGMENT_STATUSES,
  type IntakePrismAccredited,
  type IntakeRole,
  type ReportFilters,
  type SegmentContext,
  type SegmentStatus,
} from "@/types/intake"

export type ReportView = {
  segment_status: SegmentStatus | ""
  segment_context: SegmentContext | ""
  role: IntakeRole[]
  prism_accredited: IntakePrismAccredited | ""
  country: string
  region: string
  date_from: string
  date_to: string
}

/** The URL keys this view owns. */
export const REPORT_KEYS = [
  "segment_status",
  "segment_context",
  "role",
  "prism_accredited",
  "country",
  "region",
  "date_from",
  "date_to",
] as const

const DAY = /^\d{4}-\d{2}-\d{2}$/
const isOneOf = <T extends string>(list: readonly T[], v: string | null): v is T => v !== null && list.includes(v as T)
const day = (v: string | null): string => (v !== null && DAY.test(v) ? v : "")

/** What the Reports tab shows, as read from the URL. Unknown values are dropped, never guessed. */
export function reportViewFromSearch(sp: URLSearchParams): ReportView {
  const status = sp.get("segment_status")
  const context = sp.get("segment_context")
  const accredited = sp.get("prism_accredited")
  return {
    segment_status: isOneOf(SEGMENT_STATUSES, status) ? status : "",
    segment_context: isOneOf(SEGMENT_CONTEXTS, context) ? context : "",
    role: sp.getAll("role").filter((r): r is IntakeRole => isOneOf(INTAKE_ROLES, r)),
    prism_accredited: isOneOf(INTAKE_PRISM_ACCREDITED, accredited) ? accredited : "",
    country: sp.get("country") ?? "",
    region: sp.get("region") ?? "",
    date_from: day(sp.get("date_from")),
    date_to: day(sp.get("date_to")),
  }
}

/** The URL for a view. Keeps `tab` and any other key it does not own. Registrations' `page` is reset. */
export function searchFromReportView(view: ReportView, base: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(base)
  for (const k of [...REPORT_KEYS, "page"]) p.delete(k)
  if (view.segment_status) p.set("segment_status", view.segment_status)
  if (view.segment_context) p.set("segment_context", view.segment_context)
  for (const r of view.role) p.append("role", r)
  if (view.prism_accredited) p.set("prism_accredited", view.prism_accredited)
  if (view.country.trim()) p.set("country", view.country.trim())
  if (view.region.trim()) p.set("region", view.region.trim())
  if (view.date_from) p.set("date_from", view.date_from)
  if (view.date_to) p.set("date_to", view.date_to)
  return p
}

/** The API filters for a view; empty values are left out. */
export function reportFiltersFromView(view: ReportView): ReportFilters {
  const f: ReportFilters = {}
  if (view.segment_status) f.segment_status = view.segment_status
  if (view.segment_context) f.segment_context = view.segment_context
  if (view.role.length) f.role = [...view.role]
  if (view.prism_accredited) f.prism_accredited = view.prism_accredited
  if (view.country.trim()) f.country = view.country.trim()
  if (view.region.trim()) f.region = view.region.trim()
  if (view.date_from) f.date_from = view.date_from
  if (view.date_to) f.date_to = view.date_to
  return f
}

/** True when any filter is set — the tab offers "Clear filters" then. */
export function hasReportFilters(view: ReportView): boolean {
  return Object.keys(reportFiltersFromView(view)).length > 0
}

/** A bar's width as a percentage of the block's largest count; 0 when the block is all zeros. */
export function barPercent(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0
  return Math.max(2, Math.round((count / max) * 100))
}
