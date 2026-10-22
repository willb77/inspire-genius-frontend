// Job-Fit "Gaps at a glance" — pure aggregation helpers (component-free).
//
// Every variation the matches payload carries is a SUM of per-dimension
// distances: `behaviorVariation` over the behaviour dimensions, `aptitudeVariation`
// over the aptitudes, `coreTraitVariation` over the core traits, and
// `totalVariation` over everything evaluated. The colour thresholds below are
// PER-DIMENSION distances, the same unit the backend's fitScore is built from
// (100 − totalVariation / dimensionsEvaluated). Colouring a sum with them made
// every domain red for a profile whose roles My Fit called close fits. So every
// number on the page is divided by the dimensions that contributed to it.

import type { FitMatch } from "@/types/job-fit"
import { APTITUDES, BEHAVIORS, CORE_TRAITS } from "@/constants/job-blueprint/dimensions"
import type { Tone } from "@/components/fit/fit"

export type DomainKey = "behavior" | "aptitude" | "coreTrait"

export type DomainAggregate = {
  key: DomainKey
  label: string
  /** Mean distance from benchmark per dimension, averaged across roles. */
  avg: number
}

/** Dimensions per domain in the PRISM catalogue the benchmarks are drawn from. */
export const DOMAIN_DIMENSIONS: Record<DomainKey, number> = {
  behavior: BEHAVIORS.length,
  aptitude: APTITUDES.length,
  coreTrait: CORE_TRAITS.length,
}

const CATALOGUE_TOTAL =
  DOMAIN_DIMENSIONS.behavior + DOMAIN_DIMENSIONS.aptitude + DOMAIN_DIMENSIONS.coreTrait

const DOMAIN_LABELS: Record<DomainKey, string> = {
  behavior: "Behavioral style",
  aptitude: "Aptitudes",
  coreTrait: "Core traits",
}

/**
 * Whether a row's domain sums can be split by the catalogue's per-domain counts.
 *
 * The matches payload says how many dimensions were evaluated in total, not per
 * domain. When every catalogue dimension was evaluated the split is exact. When
 * the row rests on fewer (a partial profile, or a role benchmarked on a subset)
 * there is no way to know which domains lost dimensions, so the row is left out
 * of the domain averages rather than divided by a guess. Older backends send no
 * count at all; their reads were full, so they split by the catalogue.
 */
export function hasFullDomainSplit(m: FitMatch): boolean {
  if (m.coverage === "partial" || m.verdictWithheld) return false
  const evaluated = m.dimensionsEvaluated ?? m.dimensionsTotal
  if (evaluated == null) return true
  return evaluated === CATALOGUE_TOTAL
}

/** Mean per-dimension distance for one role, over the dimensions actually evaluated. */
export function perDimensionMean(m: FitMatch): number {
  const n = m.dimensionsEvaluated ?? m.dimensionsTotal ?? CATALOGUE_TOTAL
  return m.totalVariation / Math.max(1, n)
}

/**
 * Average each domain's per-dimension distance across the roles whose domain
 * split is known. Returns [] when no role qualifies.
 */
export function aggregateDomains(matches: FitMatch[]): DomainAggregate[] {
  const rows = matches.filter(hasFullDomainSplit)
  if (rows.length === 0) return []
  const sum = { behavior: 0, aptitude: 0, coreTrait: 0 }
  for (const m of rows) {
    sum.behavior += m.behaviorVariation / DOMAIN_DIMENSIONS.behavior
    sum.aptitude += m.aptitudeVariation / DOMAIN_DIMENSIONS.aptitude
    sum.coreTrait += m.coreTraitVariation / DOMAIN_DIMENSIONS.coreTrait
  }
  const n = rows.length
  return (["behavior", "aptitude", "coreTrait"] as const).map((key) => ({
    key,
    label: DOMAIN_LABELS[key],
    avg: Math.round(sum[key] / n),
  }))
}

/** Tone for a PER-DIMENSION distance from benchmark. Never pass a sum. */
export function meterTone(avg: number): Tone {
  if (avg <= 12) return "green"
  if (avg <= 25) return "teal"
  if (avg <= 40) return "amber"
  return "red"
}
