// BP-F5 — partial-profile coverage, read the same way on every fit surface.
//
// A dimension the person was never measured on is left out of the score
// (blueprint-service used to count it as 0). The backend says how many
// dimensions the score rests on; these helpers turn that into one honest
// sentence, so My fit, the role detail, Fit a JD, the report export and the
// manager's Careers tab never word it differently.

import type { FitCoverage, PerDimensionFit } from "@/types/job-fit"

export type PartialCoverage = { evaluated: number; total: number }

/**
 * The coverage of a partial read, or null for a full (or pre-BP-F5) one.
 * Only an explicit `coverage: "partial"` with both counts is partial: an older
 * payload that carries neither is a full read, never guessed at.
 */
export function partialCoverage(x: FitCoverage | null | undefined): PartialCoverage | null {
  if (!x || x.coverage !== "partial") return null
  const evaluated = x.dimensionsEvaluated
  const total = x.dimensionsTotal
  if (typeof evaluated !== "number" || typeof total !== "number" || total <= 0) return null
  return { evaluated, total }
}

/** Short label, e.g. "Partial profile · 8 of 22 measured". */
export function partialProfileLabel(p: PartialCoverage): string {
  return `Partial profile · ${p.evaluated} of ${p.total} measured`
}

/** The person-facing explanation, including the withheld rating. */
export function partialProfileDetail(p: PartialCoverage): string {
  const missing = p.total - p.evaluated
  return (
    `This score is based on the ${p.evaluated} of ${p.total} dimensions your PRISM profile ` +
    `on file measures. The other ${missing} aren't in your profile, so they're left out ` +
    `rather than counted against you. An overall fit rating is held back until every ` +
    `dimension is measured.`
  )
}

/** Shown where a dimension has no score because it was never measured. */
export const NOT_MEASURED = "Not measured"

/**
 * Did the person actually get measured on this dimension? A row with no score
 * (BP-F5) or one the backend flags `measured: false` was not. A pre-#1671 row
 * carries no flag and a number — treated as measured, as it always was.
 */
export function isMeasured(d: Pick<PerDimensionFit, "candidateScore" | "gap" | "measured">): boolean {
  if (d.measured === false) return false
  return typeof d.candidateScore === "number" && typeof d.gap === "number"
}
