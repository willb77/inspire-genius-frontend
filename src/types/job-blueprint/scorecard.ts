// Interview Scorecard types

export type ScorecardScore = 0 | 3 | 5

export type ScorecardRecommendation = 'strong-hire' | 'hire-with-plan' | 'conditional' | 'do-not-hire'

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
