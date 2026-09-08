// Interview Scorecard types

export type ScorecardScore = 0 | 3 | 5

/**
 * The evidence band a scorecard's grand total falls in. Decision SUPPORT, never
 * a verdict: until 2026-09-08 these were 'strong-hire' | 'hire-with-plan' |
 * 'conditional' | 'do-not-hire' — imperative hiring instructions, which Job
 * Studio must never issue. The cut scores (45 / 35 / 25 of 55) are unchanged.
 * The field is still called `recommendation` on the wire.
 */
export type ScorecardRecommendation =
  | 'strong-alignment'
  | 'good-alignment'
  | 'partial-alignment'
  | 'limited-alignment'

export type ScorecardEntry = {
  dimensionId: number
  dimensionName: string
  score: ScorecardScore
  evidence: string
}

export type InterviewScorecard = {
  id: string
  candidateId: string
  jobId: string
  interviewerId: string
  interviewDate: string

  behaviorScores: ScorecardEntry[]
  counterProductiveScores: ScorecardEntry[]
  aptitudeScores: ScorecardEntry[]
  coreTraitScores: ScorecardEntry[]

  grandTotal: number
  recommendation: ScorecardRecommendation
  notes: string
  completedAt: string
}

export type InterviewGuide = {
  jobId: string
  candidateId: string
  roleTitle: string
  focusDimensions: {
    dimensionId: number
    dimensionName: string
    category: string
    benchmarkScore: number
    candidateScore: number
    gap: number
    questions: string[]
  }[]
  counterProductiveQuestions: {
    dimensionName: string
    questions: string[]
  }[]
  generalQuestions: string[]
  generatedAt: string
}
