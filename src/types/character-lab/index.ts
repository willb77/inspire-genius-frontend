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

/** One slice of the narrative write-up. See analyseProfile. */
export type AnalysisPart = {
  notice: string
  name: string
  part: number
  parts: number
  sections: string[]
  analysis: string
}

export type CharacterRequest = {
  name: string
  source?: string
  notes?: string
}

// ─── Saved profiles ─────────────────────────────────────────────────────
//
// Profiles persist in two tables owned by the Character Lab alone — never in
// the PRISM stores, where a synthetic row would be indistinguishable from a
// real candidate downstream. See
// `services/agent-engine/app/tools/character_lab/profile_store.py`.

/** The recall-list shape. Deliberately NOT the whole profile. */
export type ProfileSummary = {
  id: string
  name: string
  source: string
  notes: string
  /**
   * How many scales actually came back — not how many exist. A profile built
   * from a run where a battery failed says 62, not 88.
   */
  scored: number
  has_analysis: boolean
  created_at: string | null
  updated_at: string | null
}

export type SavedProfile = ProfileSummary & {
  reading: string
  analysis: string
  scores: Record<string, ScoreByType>
  /**
   * Either flat (`{Green: 71.5}`) or the per-score-type shape `/generate`
   * returns. The table holds both because the browser has held both; readers
   * must handle either rather than assuming the newer one.
   */
  colours: Record<string, number> | Partial<Record<ScoreType, DerivedQuadrant[]>>
  evidence: Record<string, string>
  notice: string
}

/** Only the fields being changed. Omitted means "leave alone". */
export type ProfilePatch = {
  name?: string
  source?: string
  notes?: string
  analysis?: string
}

// ─── Comparison, questions, scenarios ───────────────────────────────────

/** One section of a multi-character comparison. */
export type ComparisonPart = {
  notice: string
  part: number
  parts: number
  sections: string[]
  names: string[]
  comparison: string
}

export type StarterQuestion = {
  question: string
  /** The scores that make it worth asking — this is what stops it being trivia. */
  why: string
}

export type StarterQuestions = {
  notice: string
  names: string[]
  questions: StarterQuestion[]
}

export type AskResult = {
  notice: string
  question: string
  names: string[]
  answer: string
}

/**
 * One character's read of a situation, or the collaborative one.
 *
 * `focus` is a profile id or the literal `"collaborative"`. One request per
 * focus keeps each generation inside API Gateway's 30s cap.
 */
export type ScenarioPart = {
  notice: string
  focus: string
  heading: string
  names: string[]
  behaviour: string
}

export type SavedScenario = {
  id: string
  title: string
  situation: string
  character_ids: string[]
  /** Names as they were at run time, so a run survives a rename or delete. */
  character_names: string[]
  result: { individual?: Record<string, string>; collaborative?: string }
  notice: string
  created_at: string | null
  updated_at: string | null
}

export const COLLABORATIVE = 'collaborative' as const
