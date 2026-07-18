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
  perDimension: PerDimensionFit[]
  criticalGaps: CoachingGap[]
  coachingGaps: CoachingGap[]
  overdoneFlags: OverdoneFlag[]
  interviewSelfAdvocacy: string[]
  methodologyNote: string
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
