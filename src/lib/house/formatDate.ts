/**
 * House-style dates: one format everywhere.
 *
 *   formatDate(d)     → "Nov 3, 2026"
 *   formatDateTime(d) → "Nov 3, 2026, 2:05 PM"
 *
 * Bad or missing input renders as an em dash, never as "Invalid Date", a raw
 * ISO string, or today's date (which would present a guess as a fact).
 */

export const NO_DATE = "—"

type DateInput = Date | string | number | null | undefined

function toDate(input: DateInput): Date | null {
  if (input == null || input === "") return null
  const d = input instanceof Date ? input : new Date(input)
  return isNaN(d.getTime()) ? null : d
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})

/** "Nov 3, 2026" — or "—" when the input is missing or not a date. */
export function formatDate(input: DateInput): string {
  const d = toDate(input)
  return d ? DATE_FMT.format(d) : NO_DATE
}

/** "Nov 3, 2026, 2:05 PM" — or "—" when the input is missing or not a date. */
export function formatDateTime(input: DateInput): string {
  const d = toDate(input)
  return d ? `${DATE_FMT.format(d)}, ${TIME_FMT.format(d)}` : NO_DATE
}
