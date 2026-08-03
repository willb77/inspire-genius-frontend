// Job-Fit vertical — person-side matching types.
//
// The logged-in user matches their OWN PRISM profile against published Job DNAs.
// These mirror the blueprint-service `/v1/blueprint/fit/*` contract exactly.
// Domain primitives (DimensionCategory, JobTier) are reused from job-blueprint
// so the person-side and recruiter-side share one vocabulary.

import type { DimensionCategory, JobTier } from '@/types/job-blueprint'

/**
 * Coarse, plain-language fit label the backend assigns per role. Kept as a
 * string (not a closed union) so an unrecognized band from a newer backend
 * still renders — the UI maps known bands to a tone and falls back gracefully.
 */
export type FitBand = string

/**
 * Scoring formula the user can choose (Decision D4). "gap" is gap-vs-benchmark
 * (ranked by totalVariation, the default); "closeness" is weighted-closeness
 * (ranked by closenessScore, higher = closer).
 */
export type FitMethod = 'gap' | 'closeness'

/** One published role ranked against the user's profile (best-first). */
export type FitMatch = {
  jobId: string
  roleTitle: string
  department: string | null
  tier: JobTier
  baseTier: JobTier
  fitBand: FitBand
  totalVariation: number
  behaviorVariation: number
  aptitudeVariation: number
  coreTraitVariation: number
  confidence: number | null
  /**
   * Explicit 1-100 fit score (higher = closer), from blueprint-service. Computed
   * with the SAME `_fit_percent(total, len(benchmark))` the detail page uses, so
   * the "My Fit" row and the role's detail page show the identical number.
   * Optional: older backends omit it and the UI derives an equivalent.
   */
  fitScore?: number
  /** Which formula produced this row (Decision D4). Absent on older backends. */
  method?: FitMethod
  /** 0..100 weighted-closeness score (higher = closer). Null under the gap read. */
  closenessScore?: number | null
  /**
   * The band a surface should actually render, already resolved by the backend
   * for the method in force. Under the gap read it equals `fitBand`; under the
   * closeness read it bands `closenessScore` instead.
   *
   * `fitBand` bands total variation and says nothing about a closeness score.
   * Rendering it beside one is how a working ranking — 81 / 77 / 75 / 73 / 70 —
   * came out labelled "Poor" on every row. Prefer this field; fall back to
   * `fitBand` only for older backends that do not send it.
   */
  displayBand?: FitBand
}

/** Per-dimension comparison of the user's score against the role benchmark. */
export type PerDimensionFit = {
  category: DimensionCategory
  dimensionId: number
  dimensionName: string
  candidateScore: number
  benchmarkScore: number
  gap: number
  coaching: string
}

/** A dimension where the user sits below the benchmark — a growth focus. */
export type CoachingGap = {
  dimensionName: string
  category: DimensionCategory
  gap: number
}

/** A dimension the user over-expresses relative to the role — watch for overuse. */
export type OverdoneFlag = {
  dimensionName: string
  candidateScore: number
}

/** Full fit breakdown for one role. */
export type FitDetail = {
  jobId: string
  roleTitle: string
  tier: JobTier
  baseTier: JobTier
  totalVariation: number
  /**
   * Explicit 1-100 fit score (higher = closer to the role's profile), from
   * blueprint-service. Optional: older backends omit it and the UI derives an
   * equivalent from totalVariation. Presented as an encouraging "Fit" percentage
   * — never a binary fit/no-fit verdict.
   */
  fitScore?: number
  perDimension: PerDimensionFit[]
  criticalGaps: CoachingGap[]
  coachingGaps: CoachingGap[]
  overdoneFlags: OverdoneFlag[]
  interviewSelfAdvocacy: string[]
  methodologyNote: string
  /**
   * True while behavioral matching for this role is in limited/validation
   * release. Optional: older backends omit it and the UI treats absent as false.
   */
  gated?: boolean
  /** Scoring formula used (Decision D4). Absent on older backends. */
  method?: FitMethod
  /** 0..100 weighted-closeness score. Present only under the closeness read. */
  closenessScore?: number | null
  /** Dimension keys the closeness fit most rests on (closeness read only). */
  closenessTopFactors?: string[]
  /** Dimension keys furthest from the target (closeness read only). */
  closenessTopGaps?: string[]
}

// ── Fit narration (agent-engine explain-fit) — FLAT responses, not enveloped ──

/** One gap explained in plain language with how to close it. */
export type ExplainedGap = {
  dimension: string
  plain: string
  howToClose: string
}

/** Response from POST /v1/agents/blueprint/explain-fit (flat — read res.data). */
export type ExplainFitResult = {
  overview: string
  gaps: ExplainedGap[]
  closingActions: string[]
  /** Present only when a follow-up question was asked. */
  answer: string | null
  /** Echoed back unchanged from the request — authoritative. */
  fitScore: number
  disclaimer: string
}

/** Response from POST /v1/agents/blueprint/write-resume (flat — read res.data). */
export type WriteResumeResult = {
  summary: string
  strengths: string[]
  suggestedBullets: string[]
  disclaimer: string
}

/** One adjacent role the user could grow toward. */
export type PathwaySuggestion = {
  roleTitle: string
  roleFamily?: string
  /** 'low' | 'moderate' | 'high' — kept open for forward-compat. */
  pivotDifficulty?: string
  rationale?: string
  jobId?: string | null
}

/** A skill-development ladder toward a role family. */
export type SkillLadder = {
  skill: string
  steps: string[]
}

/**
 * Career pathway payload. Every field is optional: the endpoint may be
 * feature-gated or return an empty object, and the UI renders gracefully then.
 */
export type FitPathway = {
  suggestions?: PathwaySuggestion[]
  skillLadders?: SkillLadder[]
  note?: string
}
