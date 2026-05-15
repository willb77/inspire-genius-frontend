// Assessment (Brain Mapping Light) types

import type { DimensionCategory } from './job-dna'
import type { DimensionScore } from './candidate'

export type AssessmentStatus = 'invited' | 'in-progress' | 'completed' | 'expired'

export type BMLQuestion = {
  id: string
  dimensionId: number
  dimensionName: string
  category: DimensionCategory
  text: string
  order: number
}

export type BMLResponse = {
  questionId: string
  value: number // 1-7 Likert
}

export type BMLAssessment = {
  id: string
  candidateId: string
  jobId: string
  status: AssessmentStatus
  questions: BMLQuestion[]
  responses: BMLResponse[] | null
  normalizedScores: DimensionScore[] | null
  confidenceScore: number | null
  startedAt: string | null
  completedAt: string | null
  expiresAt: string
}
