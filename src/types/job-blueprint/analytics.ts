// Analytics and reporting types

export type FunnelStage = {
  stage: string
  count: number
  percentage: number
}

/**
 * One period's count of each PREDICTED fit tier — blind, counts only.
 * Mirrors blueprint-service `ClassificationDistributionPoint` (camelCase on the wire).
 */
export type ClassificationDistributionPoint = {
  period: string
  strongFit: number
  potentialFit: number
  moderateFit: number
  misalignment: number
  total: number
}

/**
 * `GET /v1/blueprint/analytics/accuracy`. Honest by design: the platform tracks
 * no post-hire outcomes, so the backend reports the distribution of predicted
 * tiers with an explicit pending marker and a note — never an accuracy figure.
 */
export type AccuracyReport = {
  distribution: ClassificationDistributionPoint[]
  pendingOutcomeData: boolean
  note: string
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
