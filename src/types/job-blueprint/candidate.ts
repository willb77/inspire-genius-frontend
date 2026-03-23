// Candidate and Pipeline types for Job Blueprint

import type { DimensionCategory } from './job-dna'

export type PipelineStep =
  | 'intake'
  | 'assessment-invited'
  | 'assessment-completed'
  | 'fit-scored'
  | 'classified'
  | 'insights-delivered'
  | 'interview-scheduled'
  | 'interview-completed'
  | 'hired'
  | 'rejected'

export type ClassificationTier = 'strong-fit' | 'potential-fit' | 'moderate-fit' | 'misalignment'

export type DimensionScore = {
  dimensionId: number
  dimensionName: string
  category: DimensionCategory
  score: number // 0-100
}

export type VariationResult = {
  behaviorVariation: number
  aptitudeVariation: number
  coreTraitVariation: number
  totalVariation: number
  standardDeviation: number
  skew: number // positive = exceeds benchmarks
  perDimension: { dimensionId: number; variation: number }[]
}

export type InsightPackage = {
  candidateId: string
  jobId: string
  fitScore: number
  tier: ClassificationTier
  gapAnalysis: {
    dimensionId: number
    dimensionName: string
    category: string
    candidateScore: number
    benchmarkScore: number
    gap: number
    recommendation: string
  }[]
  interviewFocusAreas: string[]
  probeQuestions: { area: string; question: string }[]
  riskFactors: string[]
  opportunityFactors: string[]
  generatedAt: string
}

export type Candidate = {
  id: string
  jobId: string
  name: string
  email: string
  code?: string
  status: PipelineStep
  assessmentId: string | null
  prismScores: DimensionScore[] | null
  variationScores: VariationResult | null
  classificationTier: ClassificationTier | null
  scorecardId: string | null
  insightPackage: InsightPackage | null
  createdAt: string
  updatedAt: string
}
