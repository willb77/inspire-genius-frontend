// JF-5 — the fit cards' data, component-free (react-refresh only-export-components).
//
// The cards replace the radar on the Careers and Jobs breakdown only when the
// server scored the read on the role's priority dimensions — `scoring:
// "priority-9"`, which blueprint-service sets ONLY when the `job_fit_v2` switch
// applies to the caller (no row, no table, a failed read: omitted). The browser
// never decides that; it renders what the response carries. Anything else —
// an older payload, a 22-dimension read, a priority read with no priority rows —
// returns null and the breakdown draws today's radar unchanged.

import type { FitDetail, PerDimensionFit } from "@/types/job-fit"
import type { DimensionCategory } from "@/types/job-blueprint"
import { isMeasured } from "@/lib/job-fit/coverage"
import {
  FIT_CARD_GROUP_ORDER,
  dimensionDefinition,
  type FitCardStatus,
} from "@/constants/fit-definitions"

/** The `scoring` value JF-2 sets on a priority-scored read. */
export const PRIORITY_SCORING = "priority-9"

/** JF-2's additive fields, absent on every read the switch did not apply to. */
type PriorityAwareDetail = FitDetail & { scoring?: unknown }
type PriorityAwareDimension = PerDimensionFit & { priority?: unknown }

export type FitCardItem = {
  key: string
  category: DimensionCategory
  dimensionName: string
  definition: string | null
  /** What the job asks for, rounded. */
  jobRating: number
  /** The person's rating, rounded; null when never measured. */
  personRating: number | null
  /** personRating − jobRating; null when never measured. */
  difference: number | null
  status: FitCardStatus | null
}

export type FitCardGroup = { category: DimensionCategory; items: FitCardItem[] }

/**
 * Match / close / growth area from the signed rating difference (person − job).
 * The same cut points as the per-dimension pills below the cards (`gapTone`),
 * so a card and its row never disagree on the same page.
 */
export function fitCardStatus(difference: number): FitCardStatus {
  if (difference >= 0) return "match"
  if (difference >= -10) return "close"
  return "growth"
}

/** Is this read priority-scored (the `job_fit_v2` switch applied server-side)? */
export function isPriorityScored(data: FitDetail): boolean {
  return (data as PriorityAwareDetail).scoring === PRIORITY_SCORING
}

/**
 * The cards for one breakdown, grouped and ordered, or null when the breakdown
 * must draw today's radar instead.
 */
export function fitCardGroups(data: FitDetail): FitCardGroup[] | null {
  if (!isPriorityScored(data)) return null
  const rows = data.perDimension.filter((d) => (d as PriorityAwareDimension).priority === true)

  const groups: FitCardGroup[] = []
  for (const category of FIT_CARD_GROUP_ORDER) {
    const items = rows
      .filter((d) => d.category === category)
      .map((d): FitCardItem => {
        const measured = isMeasured(d) && d.candidateScore !== null
        const jobRating = Math.round(d.benchmarkScore)
        const personRating = measured ? Math.round(d.candidateScore as number) : null
        const difference = personRating === null ? null : personRating - jobRating
        return {
          key: `${d.category}-${d.dimensionId}`,
          category: d.category,
          dimensionName: d.dimensionName,
          definition: dimensionDefinition(d.category, d.dimensionId, d.dimensionName),
          jobRating,
          personRating,
          difference,
          status: difference === null ? null : fitCardStatus(difference),
        }
      })
    if (items.length > 0) groups.push({ category, items })
  }
  return groups.length > 0 ? groups : null
}
