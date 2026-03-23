// Job DNA types for Job Blueprint microservice

export type DimensionCategory = 'behavior' | 'aptitude' | 'core-trait'

export type InterpretationBand = 'very-high' | 'natural' | 'moderate' | 'low' | 'avoidance'

export type JobTier = 'front-line' | 'professional' | 'executive'

export type JobDNAStatus = 'draft' | 'benchmarked' | 'active' | 'archived'

export type DimensionBenchmark = {
  dimensionId: number
  dimensionName: string
  category: DimensionCategory
  rankPosition: number
  rankPercent: number
  rateValue: number
  finalBenchmarkPercent: number
  interpretation: InterpretationBand
}

export type ContextSurveyResponse = {
  questionId: string
  response: string
  respondentId: string
}

export type JobDNA = {
  id: string
  orgId: string
  roleTitle: string
  department: string
  tier: JobTier
  status: JobDNAStatus

  // Pillar 1: Behavioral Requirements
  behaviors: DimensionBenchmark[]
  aptitudes: DimensionBenchmark[]
  coreTraits: DimensionBenchmark[]
  counterProductiveBehaviors: string[]

  // Pillar 2: Role Context
  roleContext: {
    workPressures: string[]
    requiredWorkStyles: string[]
    environmentalFactors: string[]
    culturalFactors: string[]
    surveyResponses?: ContextSurveyResponse[]
  }

  // Pillar 3: Job Role Deliverables
  deliverables: {
    jobDescription: string
    kpis: string[]
    criticalActivities: string[]
    keyInteractions: string[]
    competencyFramework?: string
  }

  createdBy: string
  createdAt: string
  updatedAt: string
  version: number
}
