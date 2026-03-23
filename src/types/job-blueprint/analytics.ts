// Analytics and reporting types

export type FunnelStage = {
  stage: string
  count: number
  percentage: number
}

export type AccuracyDataPoint = {
  month: string
  predicted: number
  actual: number
}

export type TimeToFillDataPoint = {
  month: string
  days: number
  tier: string
}

export type HiresByPeriod = {
  period: string
  hires: number
  avgFitScore: number
}

export type BlueprintStats = {
  totalJobDnas: number
  activeJobs: number
  totalCandidates: number
  avgTimeToFill: number
  strongFitRate: number
  hiresThisMonth: number
}

export type ActivityItem = {
  id: string
  type: 'job-created' | 'candidate-intake' | 'assessment-completed' | 'candidate-classified' | 'scorecard-submitted' | 'hired'
  description: string
  timestamp: string
  metadata?: Record<string, string>
}
