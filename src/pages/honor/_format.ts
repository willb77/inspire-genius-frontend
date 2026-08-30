// The Honor Foundation — Coach Workbench: pure formatting + style helpers.
//
// Split from _shared.tsx (component-only) so the react-refresh
// only-export-components rule stays satisfied.

/** Solid THF-orange primary button styling helper (Tailwind classes). */
export const HONOR_BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#E8792B] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c9631a] disabled:opacity-50 disabled:cursor-not-allowed"

/** Outline button styling helper. */
export const HONOR_BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#c6cdd9] bg-white px-3.5 py-2 text-sm font-semibold text-[#1B2A4A] transition-colors hover:bg-[#f6f7f9] disabled:opacity-50"

/** Fellow full name from first/last. */
export function fellowName(first: string, last: string): string {
  return `${first} ${last}`.trim()
}

/** Initials from a full name (max 2). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

/** Human status label for a fellow's assessment state. */
export function fellowStatusLabel(status: string): string {
  if (status === "assessed") return "Assessed"
  if (status === "intake-pending") return "Intake pending"
  if (status === "invited") return "Invited"
  return status
}

/**
 * Relative "time ago" label for an ISO timestamp (e.g. "3h ago", "just now").
 * Falls back to the raw string when the value can't be parsed, so a malformed
 * `when` never blanks out the row.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return iso
  const diffSec = Math.round((now - ts) / 1000)
  if (diffSec < 0) return "just now"
  if (diffSec < 45) return "just now"
  const mins = Math.round(diffSec / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(days / 365)}y ago`
}

/** "Mon, Jul 13 · 9:00 AM" style label for a session timestamp (locale-safe). */
export function formatSessionTime(iso: string): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return iso
  const d = new Date(ts)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12 || 12
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} · ${h}:${m} ${ampm}`
}

/** ISO date bucket (YYYY-MM-DD, local) for grouping sessions by day. */
export function sessionDayKey(iso: string): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return iso
  const d = new Date(ts)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`
}

/** "Mon, Jul 13" day heading from a YYYY-MM-DD bucket key. */
export function formatDayHeading(dayKey: string): string {
  const [y, mo, dd] = dayKey.split("-").map(Number)
  if (!y || !mo || !dd) return dayKey
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const dow = new Date(y, mo - 1, dd).getDay()
  return `${days[dow]}, ${months[mo - 1]} ${dd}`
}

/** Short time label "9:00 AM" from an ISO timestamp. */
export function formatClock(iso: string): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return iso
  const d = new Date(ts)
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}
