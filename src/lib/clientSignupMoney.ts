/**
 * Money helpers for the Client Sign-Up surface.
 *
 * Amounts cross the wire as integer CENTS and are stored that way. The service
 * reconciles the invoicing summary against the SOW with an exact equality
 * (Appendix B: "Total one-time (must equal SOW total)"), and float dollars do
 * not survive one — 0.1 + 0.2 !== 0.3 would put a one-cent discrepancy on
 * screen that does not exist in the data, and train people to click past the
 * warning that exists to stop a wrong invoice.
 *
 * So: parse once on the way in, format once on the way out, and never do
 * arithmetic on a dollar string.
 *
 * These live in `lib/` rather than beside the page because both pages need
 * them, and exporting a non-component from a page file breaks React Fast
 * Refresh (`react-refresh/only-export-components`).
 */

/** Cents → "$48,000". For reading only — never parse this back. */
export function formatMoney(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

/**
 * Dollars typed by a human → integer cents.
 *
 * Strips currency symbols, thousands separators and stray spaces, so "48,000",
 * "$48000" and " 48000 " all land on the same number. Anything that does not
 * parse becomes 0 rather than NaN: a NaN would propagate into a total and
 * render as "$NaN", which is worse than a visible zero the user can correct.
 */
export function toCents(input: string): number {
  const n = Number.parseFloat(input.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** Cents → the bare number a text input should show. 0 renders as empty. */
export function centsToInput(cents: number | null | undefined): string {
  return cents ? String(cents / 100) : ""
}
