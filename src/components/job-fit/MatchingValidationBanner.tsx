// Job-Fit vertical — standardized "matching validation" banner.
//
// Rendered prominently on every fit-classification surface so behavioral
// matching never reads as an employment/selection verdict about the user.
// Amber/attention tone, ShieldAlert icon. Theme-aware (class-based dark mode).
// Styled card (not shadcn Alert — the Alert primitive isn't in this repo's
// ui set) using Tailwind utilities only.

import { ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The single, standardized guidance body shown when the backend supplies no
 * `methodologyNote`. Kept in one place so the copy stays consistent across the
 * matches, gap, and per-role fit surfaces.
 */
const DEFAULT_NOTE =
  "This compares your behavioral profile to a role's published benchmark to help you " +
  "focus development and interview preparation. It is decision support only — never the " +
  "sole basis for a hiring, promotion, or selection decision."

/** Extra line shown while behavioral matching is in limited/validation release. */
const GATED_NOTE =
  "Behavioral matching is currently in a limited validation release — treat these results " +
  "as directional guidance while the model is still being validated."

export type MatchingValidationBannerProps = {
  /** Backend-authored methodology note; falls back to standardized default copy. */
  note?: string
  /** When true, adds a limited/validation-release caveat line. */
  gated?: boolean
  className?: string
}

/**
 * Prominent, standardized banner asserting that Job-Fit is decision support,
 * not a validated selection instrument. Reused across all fit surfaces.
 */
export function MatchingValidationBanner({
  note,
  gated = false,
  className,
}: MatchingValidationBannerProps) {
  return (
    <div
      // "status" while gated (a live validation-release state), "note" otherwise.
      role={gated ? "status" : "note"}
      aria-label="Matching validation notice"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        "border-amber-300 bg-amber-50 text-amber-900",
        "dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100",
        className
      )}
    >
      <ShieldAlert
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-snug">
          Decision support only — not a validated selection instrument.
        </p>
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
          {note ?? DEFAULT_NOTE}
        </p>
        {gated && (
          <p className="text-xs font-medium leading-relaxed text-amber-800 dark:text-amber-200/90">
            {GATED_NOTE}
          </p>
        )}
      </div>
    </div>
  )
}

export default MatchingValidationBanner
