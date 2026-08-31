// Job-Fit vertical — pure presentation helpers.
//
// Component-free so the react-refresh/only-export-components rule stays happy
// (UI primitives live in ./_shared). Everything here maps backend numbers/labels
// to plain-language, person-facing copy — never raw PRISM jargon.

import type { JobTier } from "@/types/job-blueprint"
import type { FitBand } from "@/types/job-fit"

export type Tone = "teal" | "green" | "amber" | "red" | "gray"

/** Plain-language label for a role tier. */
export function tierLabel(tier: JobTier): string {
  switch (tier) {
    case "front-line":
      return "Front-line"
    case "professional":
      return "Professional"
    case "executive":
      return "Executive"
    default:
      return tier
  }
}

/**
 * Map a fit band to a tone. Bands are backend-authored strings; we normalise
 * a handful of well-known shapes and fall back to neutral so an unrecognised
 * band still renders.
 */
export function bandTone(band: FitBand): Tone {
  const b = band.toLowerCase()
  if (/(excellent|strong|high)/.test(b)) return "green"
  if (/(good|solid|moderate|medium)/.test(b)) return "teal"
  if (/(develop|emerging|partial|stretch)/.test(b)) return "amber"
  if (/(low|weak|misalign|poor)/.test(b)) return "red"
  return "gray"
}

/** Human-readable band label (title-cased, hyphens → spaces). */
export function bandLabel(band: FitBand): string {
  if (!band) return "Unrated"
  return band
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

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
