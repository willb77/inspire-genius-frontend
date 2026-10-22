// Fit — pure presentation helpers, shared by every surface that shows a fit
// (Career Fit, Direction Setting, Fit a JD, history). Moved from
// `pages/job-fit/_fit.ts` by FIT-5a.
//
// Component-free so the react-refresh/only-export-components rule stays happy
// (UI primitives live in ./primitives). Everything here maps backend numbers/labels
// to plain-language, person-facing copy — never raw PRISM jargon.

import type { FitCoverage, FitMethod } from "@/types/job-fit"
import { ROUTES } from "@/constants/routes"

export type Tone = "teal" | "green" | "amber" | "red" | "gray"

/** Tone for a per-dimension gap: negative gap (below benchmark) = growth area. */
export function gapTone(gap: number): Tone {
  if (gap >= 0) return "green"
  if (gap >= -10) return "amber"
  return "red"
}

/** Signed gap string, e.g. "+6" / "-12". */
export function formatGap(gap: number): string {
  return gap > 0 ? `+${gap}` : `${gap}`
}

/**
 * Explicit 1-100 fit percentage (higher = closer). Prefer the backend's
 * authoritative fitScore; when an older backend omits it, derive the SAME value
 * from total variation (100 − mean per-dimension variation), floored at 1 so we
 * never show a bare 0 that reads as a binary rejection.
 */
export function fitPercent(
  fitScore: number | undefined,
  totalVariation: number,
  nDims: number
): number {
  if (typeof fitScore === "number" && Number.isFinite(fitScore)) {
    return Math.max(1, Math.min(100, Math.round(fitScore)))
  }
  const denom = Math.max(1, nDims)
  return Math.max(1, Math.min(100, Math.round(100 - totalVariation / denom)))
}

/** What `displayFitPercent` reads — a fit row (FitMatch) or a breakdown (FitDetail). */
export type FitPercentSource = FitCoverage & {
  fitScore?: number
  totalVariation: number
  method?: FitMethod
  closenessScore?: number | null
  perDimension?: readonly unknown[]
}

/**
 * How many dimensions the fallback averages over — one rule for rows and
 * breakdowns (FIT-1). The dimensions the score actually rests on
 * (`dimensionsEvaluated`, BP-F5) win; an older breakdown without them counts
 * its own per-dimension rows; an older row counts the benchmark
 * (`dimensionsTotal`), and only a payload carrying none of these assumes 22.
 */
export function fitPercentDenominator(x: FitPercentSource): number {
  if (typeof x.dimensionsEvaluated === "number" && x.dimensionsEvaluated > 0) return x.dimensionsEvaluated
  if (x.perDimension && x.perDimension.length > 0) return x.perDimension.length
  if (typeof x.dimensionsTotal === "number" && x.dimensionsTotal > 0) return x.dimensionsTotal
  return 22
}

/**
 * The fit % a surface shows for one role — the SAME number on the list row,
 * the role's breakdown, a reopened report and Direction Setting (FIT-1).
 *
 * Under the closeness read the score is `closenessScore`; otherwise the gap
 * read's authoritative `fitScore`, derived from total variation only when an
 * older payload omits it.
 */
export function displayFitPercent(x: FitPercentSource): number {
  if (x.method === "closeness" && typeof x.closenessScore === "number" && Number.isFinite(x.closenessScore)) {
    return Math.max(1, Math.min(100, Math.round(x.closenessScore)))
  }
  return fitPercent(x.fitScore, x.totalVariation, fitPercentDenominator(x))
}

/** A `?method=` value from a link, or the backend default ("gap") for anything else. */
export function parseFitMethod(raw: string | null | undefined): FitMethod {
  return raw === "closeness" ? "closeness" : "gap"
}

/**
 * The role's breakdown, opened under the read the link came from. The default
 * (gap) read stays the bare path, so every existing link is unchanged.
 */
export function fitDetailPath(jobId: string, method: FitMethod | undefined): string {
  const base = ROUTES.JOB_FIT.detail(jobId)
  return method === "closeness" ? `${base}?method=closeness` : base
}

/** Tone for a fit percentage — encouraging, never binary. */
export function fitPercentTone(pct: number): Tone {
  if (pct >= 80) return "green"
  if (pct >= 60) return "teal"
  if (pct >= 40) return "amber"
  return "red"
}

/** A short, encouraging label for a fit percentage (NEVER fit/no-fit). */
export function fitPercentLabel(pct: number): string {
  if (pct >= 80) return "Closely aligned with this role"
  if (pct >= 60) return "Well aligned, with room to grow"
  if (pct >= 40) return "Aligned in parts, with clear areas to develop"
  return "Early alignment — real strengths and clear areas to develop"
}

/**
 * The Job Fit narrative surface (fit %, description, gaps, follow-up, actions)
 * is on by default. A localStorage kill-switch (`job_fit_narrative` = "false")
 * disables it — mirrors the vertical's other client-side toggles.
 */
export function jobFitNarrativeEnabled(): boolean {
  try {
    return localStorage.getItem("job_fit_narrative") !== "false"
  } catch {
    return true
  }
}

/** Tone for extractor confidence (0–1): higher confidence reads greener. */
export function confidenceTone(confidence: number): Tone {
  if (confidence >= 0.75) return "green"
  if (confidence >= 0.5) return "teal"
  if (confidence >= 0.25) return "amber"
  return "gray"
}

/**
 * Where one row sits in the list it was shown in — computed once by
 * `FitMatchList` and handed to each row's figure. FIT-5 builds this seam and
 * renders nothing with it; FIT-4a/4b decide whether a rank ("3rd of 42") or a
 * range-relative read is ever drawn. `best` and `median` are fit percentages
 * (`displayFitPercent`), so a later figure can never disagree with the number.
 */
export type FitListContext = { rank: number; of: number; best: number; median: number }

export function fitListContexts(rows: readonly FitPercentSource[]): FitListContext[] {
  const pcts = rows.map(displayFitPercent)
  if (pcts.length === 0) return []
  const sorted = [...pcts].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const best = sorted[sorted.length - 1]
  return pcts.map((_, i) => ({ rank: i + 1, of: pcts.length, best, median }))
}
