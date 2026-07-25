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

/**
 * Lower total variation = closer to the role's benchmark. Turn the raw number
 * into an encouraging, plain-language closeness descriptor.
 */
export function variationDescriptor(totalVariation: number): string {
  if (totalVariation <= 10) return "Very close to this role's profile"
  if (totalVariation <= 20) return "A strong overall match"
  if (totalVariation <= 35) return "A workable match with a few growth areas"
  return "A stretch — several areas to develop"
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
