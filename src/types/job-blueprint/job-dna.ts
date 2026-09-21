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
  /** Three-way importance tier (Manual §3): critical ≥ 65, counter-productive ≤ 35, else unimportant. Absent on older backends. */
  importanceTier?: "critical" | "counter-productive" | "unimportant"
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
  /** Tier-shape conformance of the saved benchmark (Manual §3) — reported by the service, never enforced. */
  shape?: { conforms: boolean; counts: Record<string, Record<string, number>>; violations: string[] }
  /** Set when this version replaced an earlier active one. */
  supersedesId?: string | null
  createdAt: string
  updatedAt: string
  version: number
}
