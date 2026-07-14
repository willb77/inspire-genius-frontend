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
