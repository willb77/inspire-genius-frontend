// Knowledge Continuity vertical — domain types.
// Models the trainer-service continuity endpoint payloads consumed by the
// Program-Health dashboard.

// ── Vertical Core types, re-exported under Knowledge Continuity's names ──────
// These are not this vertical's to define — they are the vertical contract,
// owned by `@/verticals/core`. Aliased here so services keep reading naturally.

export type {
  MeProfile,
  UserPreferences,
  VerticalApiResponse,
} from "@/verticals/core"

/** Validity-band counts for captured knowledge units. */
export type ValidityBands = {
  validated: number
  provisional: number
  needs_review: number
  deprecated: number
}

/** Taxonomy / knowledge-unit coverage counts. */
export type CoverageStats = {
  taxonomy_nodes_total: number
  nodes_with_units: number
  units_total: number
}

/** Freshness of captured knowledge units. */
export type CurrencyStats = {
  fresh_units: number
  stale_units: number
  pct_fresh: number | null
}

/** Capture-session pipeline counts. */
export type CaptureSessionStats = {
  scheduled: number
  in_progress: number
  captured: number
  synthesized: number
  validated: number
}

/** Review queue backlog counts. */
export type ReviewQueueStats = {
  pending_approvals: number
  unresolved_contradictions: number
}

export type CurriculaStats = {
  count: number
}

export type CapturePriority = "urgent" | "high" | "medium" | "low"

export type RiskByPriority = {
  urgent: number
  high: number
  medium: number
  low: number
}

/** A single at-risk role/expert entry surfaced on the analytics summary. */
export type TopAtRiskEntry = {
  id: string
  role_title: string
  kri: number
  capture_priority: CapturePriority
  capture_status: string
}

export type RiskRegisterSummary = {
  by_priority: RiskByPriority
  top_at_risk: TopAtRiskEntry[]
  uncaptured_urgent: number
}

/** GET /v1/trainer/continuity/analytics response payload. */
export type ContinuityAnalytics = {
  org_id: string | null
  fresh_days: number
  validity_bands: ValidityBands
  mean_kvi: number | null
  coverage: CoverageStats
  currency: CurrencyStats
  capture_sessions: CaptureSessionStats
  review_queue: ReviewQueueStats
  curricula: CurriculaStats
  risk_register: RiskRegisterSummary
}

/** A single row from GET /v1/trainer/continuity/risk-register. */
export type RiskEntry = {
  id: string
  org_id: string | null
  expert_user_id: string
  role_title: string
  exit_risk: number
  role_criticality: number
  doc_gap: number
  bus_factor: number
  kri: number
  retirement_horizon_months: number | null
  capture_status: string
  capture_priority: CapturePriority
  computed_at: string
}
