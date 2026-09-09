// Job-Fit vertical — person-side matching types.
//
// The logged-in user matches their OWN PRISM profile against published Job DNAs.
// These mirror the blueprint-service `/v1/blueprint/fit/*` contract exactly.
// Domain primitives (DimensionCategory, JobTier) are reused from job-blueprint
// so the person-side and recruiter-side share one vocabulary.

import type { DimensionCategory, JobTier } from '@/types/job-blueprint'
import type { TargetBenchmarkInput } from '@/types/targets'

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
  /**
   * How many critical dimensions (benchmark ≥ 65) this person misses by more
   * than 25 points.
   *
   * **Two or more caps `tier` at `misalignment` no matter how close the overall
   * profile is.** That is why a row can carry `baseTier: "strong-fit"`,
   * `fitScore: 81` and `tier: "misalignment"` simultaneously — all three are
   * true, and showing only the last of them as an unexplained "Poor" is what
   * made every match look like a rejection.
   *
   * Optional: older backends do not send it, and absent is not zero.
   */
  criticalGapCount?: number
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

/**
 * Body of `POST /v1/blueprint/fit/target` — score the user's OWN PRISM against a
 * caller-supplied target, normally the draft "Fit a job description" extracted.
 * The response is a `FitDetail` with an empty `jobId` (a pasted JD has no
 * published role behind it) and `roleTitle` echoed from here.
 */
export type FitTargetRequest = {
  target: TargetBenchmarkInput[]
  method?: FitMethod
  roleTitle?: string
}

// ── Fit history (JS-3) — `/v1/blueprint/fit/history*` ─────────────────────────

/** Where a history row came from. */
export type FitSnapshotSource = 'matches' | 'detail' | 'target' | 'saved'

/** One row of the person's fit history, as listed (no payload). */
export type FitSnapshotSummary = {
  id: string
  source: FitSnapshotSource
  jobId: string | null
  roleTitle: string
  fitScore: number | null
  tier: string | null
  engineVersion: string
  computedAt: string
}

/** One row with the response as it was served — a FitDetail, a FitMatch list, or a saved blob. */
export type FitSnapshot = FitSnapshotSummary & {
  payload: FitDetail | FitMatch[] | Record<string, unknown>
}

/** Body of `POST /v1/blueprint/fit/history` — "Save to your fit reports". */
export type FitSnapshotSaveBody = {
  jobId?: string | null
  roleTitle?: string
  fitScore?: number | null
  tier?: string | null
  payload?: FitDetail | Record<string, unknown>
  /** Only the one-time localStorage import sets this, to keep the original save date. */
  computedAt?: string
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
