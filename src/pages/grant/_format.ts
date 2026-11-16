// GRANT vertical — pure formatting helpers (UI-2..7).
//
// Kept in their own module (separate from the _shared components) so the
// react-refresh/only-export-components rule stays satisfied and these can be
// unit-tested without pulling in React.

import type { TFunction } from "i18next"

/** USD, no cents — the house style across GRANT surfaces. */
export function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

/** Human date, e.g. "Jun 30, 2026". Falls back to the raw string if unparseable. */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** Whole days from today (UTC-normalized) until the given ISO date. Negative = past. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return 0
  const ms = target.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

/**
 * Relative phrasing for a deadline, e.g. "in 12 days", "due today", "3 days ago".
 * Pass `t` (from useTranslation("grantPages")) to localise; without it the English
 * phrasing is returned, which is what the pure-function unit tests exercise.
 */
export function relativeDeadline(iso: string, now: Date = new Date(), t?: TFunction): string {
  const days = daysUntil(iso, now)
  if (!t) {
    if (days === 0) return "due today"
    if (days === 1) return "due tomorrow"
    if (days > 1) return `in ${days} days`
    if (days === -1) return "1 day ago"
    return `${Math.abs(days)} days ago`
  }
  if (days === 0) return t("format.dueToday", "due today")
  if (days === 1) return t("format.dueTomorrow", "due tomorrow")
  if (days > 1) {
    return t("format.inDays", {
      count: days,
      defaultValue_one: "in {{count}} day",
      defaultValue_other: "in {{count}} days",
    })
  }
  return t("format.daysAgo", {
    count: Math.abs(days),
    defaultValue_one: "{{count}} day ago",
    defaultValue_other: "{{count}} days ago",
  })
}
