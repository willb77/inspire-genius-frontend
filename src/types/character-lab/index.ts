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
  scores: Record<string, ScoreByType>
  evidence: Record<string, string>
  missing: string[]
}

export type CharacterRequest = {
  name: string
  source?: string
  notes?: string
}
