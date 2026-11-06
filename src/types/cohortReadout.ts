/**
 * N-3 cohort read-out — the agent-engine `/v1/agents/cohort-readout` payload.
 *
 * Every number here is an aggregate over an organisation's members. Cells
 * under 5 people arrive already suppressed (`count: null`, `display: "<5"`);
 * the page renders them as given and never derives one.
 */
export type CohortCell = {
  count: number | null
  percent: number | null
  suppressed: boolean
  display: string
}

export type CohortMetric = CohortCell & { label: string }

export type CohortPracticeMetric = CohortMetric & { sessions: number | null }

export type CohortFitCell = CohortCell & { tier: string; label: string }

export type CohortReadoutSuppressed = {
  level: "org"
  threshold: number
  since: string | null
  suppressed: true
  reason: string
  members: null
  orgId: string
  generatedAt: string
}

export type CohortReadoutFull = {
  level: "org"
  threshold: number
  since: string | null
  suppressed: false
  members: number
  metrics: {
    prismCoverage: CohortMetric
    goalsSet: CohortMetric
    goalsProgressed: CohortMetric
    practice: CohortPracticeMetric
  }
  jobFit: { withheld: boolean; cells: CohortFitCell[] }
  suppressedCells: number
  orgId: string
  generatedAt: string
}

export type CohortReadout = CohortReadoutSuppressed | CohortReadoutFull

export type CohortExportFormat = "csv" | "docx"
