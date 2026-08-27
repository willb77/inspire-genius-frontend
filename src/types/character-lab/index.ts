/** Types for the Character Lab — fictional characters mapped onto PRISM. */

/** One score, per score type. Batteries that carry a single value use `Underlying`. */
export type ScoreByType = Partial<Record<'Adapted' | 'Underlying' | 'Consistent', number>>

export type ScoreType = 'Adapted' | 'Underlying' | 'Consistent'

export const SCORE_TYPES: ScoreType[] = ['Adapted', 'Underlying', 'Consistent']

export type RubricDimension = {
  key: string
  label: string
  measures: string
  high: string
  low: string
  /** False for SD Score and Skew, which are response-style indicators on their own scales. */
  is_trait: boolean
}

export type RubricGroup = {
  group: string
  definition: string
  per_score_type: boolean
  /**
   * How many /battery calls this group needs.
   *
   * Batteries are split because a single request for all of one group's scales
   * can exceed API Gateway's 30s integration cap — the Career Development
   * Analysis battery (26 scales x 3 score types) returned 503 at 30.1s. The
   * server owns the split rule and publishes the count; do not recompute it.
   */
  parts: number
  dimensions: RubricDimension[]
}

export type RubricBand = {
  min: number
  max: number
  label: string
  meaning: string
}

export type Rubric = {
  notice: string
  score_types: Record<string, string>
  bands: RubricBand[]
  groups: RubricGroup[]
}

export type DerivedQuadrant = {
  quadrant_id: 1 | 2 | 3 | 4
  name: 'Green' | 'Blue' | 'Red' | 'Gold'
  value: number
  band: string
}

export type GenerateResult = {
  notice: string
  name: string
  source: string
  reading: string
  scores: Record<string, ScoreByType>
  evidence: Record<string, string>
  missing: string[]
  colours: Partial<Record<ScoreType, DerivedQuadrant[]>>
}

export type BatteryResult = {
  group: string
  /** Which slice of the battery this answered, and how many there are. */
  part: number
  parts: number
  scores: Record<string, ScoreByType>
  evidence: Record<string, string>
  missing: string[]
}

export type CharacterRequest = {
  name: string
  source?: string
  notes?: string
}
