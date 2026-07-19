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

// ── Reviewer console ─────────────────────────────────────────────────────────

export type KnowledgeUnitCriticality = "normal" | "high"

/** A single captured knowledge unit awaiting SME/practitioner review. */
export type KnowledgeUnit = {
  id: string
  session_id: string
  taxonomy_node_id: string | null
  category: string
  title: string
  body: string
  structured: Record<string, unknown> | null
  document_id: string | null
  criticality: KnowledgeUnitCriticality
  kvi: number
  validity_band: string
  kvi_features: Record<string, unknown> | null
  captured_at: string | null
}

/** An unresolved contradiction between two captured knowledge units. */
export type ContradictionRelation = {
  id: string
  from_unit_id: string
  to_unit_id: string
  relation_type: string
  resolved: boolean
  created_at?: string
}

/** GET /v1/trainer/continuity/review-queue response payload. */
export type ReviewQueue = {
  needs_review_units: KnowledgeUnit[]
  unresolved_contradictions: ContradictionRelation[]
}

export type ValidationVerdict = "confirm" | "amend" | "reject"

/** POST /v1/trainer/continuity/units/{unitId}/validations request body. */
export type ValidationRequest = {
  validator_user_id: string
  method: "sme_review"
  verdict: ValidationVerdict
  notes?: string
}

/**
 * POST /v1/trainer/continuity/units/{unitId}/validations response payload.
 * The updated unit, plus an optional `note` when a `confirm` is held at
 * `provisional` pending a practitioner + a second confirmation.
 */
export type ValidationResponse = KnowledgeUnit & {
  note?: string
}

/** POST /v1/trainer/continuity/risk-register request body. */
export type RegisterRiskRequest = {
  org_id: string
  expert_user_id: string
  role_title: string
  exit_risk: number
  role_criticality: number
  doc_gap: number
  bus_factor: number
  retirement_horizon_months?: number
}

/** POST /v1/trainer/continuity/sessions request body. */
export type StartSessionRequest = {
  org_id: string
  expert_user_id: string
  role_title: string
  successor_user_id?: string
  taxonomy_id?: string
  is_synthetic: boolean
  consent_event_id?: string
}

/** POST /v1/trainer/continuity/sessions response payload. */
export type StartSessionResponse = {
  id: string
  status: string
  is_synthetic: boolean
  org_id?: string
  expert_user_id?: string
  role_title?: string
  successor_user_id?: string | null
  taxonomy_id?: string | null
  consent_event_id?: string | null
  created_at?: string
}

// ── Successor Curriculum surface ─────────────────────────────────────────────

/**
 * A captured knowledge unit as embedded in a curriculum's `units_by_id` map.
 * Structurally the same as {@link KnowledgeUnit}, but `session_id` may be null —
 * a unit can outlive the session that produced it.
 */
export type CurriculumUnit = Omit<KnowledgeUnit, "session_id"> & {
  session_id: string | null
}

/** A row from GET /v1/trainer/continuity/curricula — one published curriculum. */
export type CurriculumSummary = {
  template_id: string
  name: string
  wiring_style: string | null
  taxonomy_id: string | null
  session_id: string | null
  module_count: number
  cited_unit_count: number
  published_by: string | null
  created_at: string | null
}

/** A single taught item within a curriculum module. */
export type CurriculumItem = {
  text: string
  cited_unit_ids: string[]
  kind?: string
}

/** A curriculum module — an ordered group of taught items. */
export type CurriculumModule = {
  title: string
  ordered_unit_ids?: string[]
  items: CurriculumItem[]
}

/**
 * GET /v1/trainer/continuity/curricula/{template_id} response payload.
 * A cited unit id in an item's `cited_unit_ids` may be ABSENT from
 * `units_by_id` when the source unit was purged — render those as an
 * "unresolved citation", never assume the lookup succeeds.
 */
export type CurriculumDetail = {
  template_id: string
  name: string
  wiring_style: string | null
  taxonomy_id: string | null
  session_id: string | null
  published_by: string | null
  created_at: string | null
  modules: CurriculumModule[]
  units_by_id: Record<string, CurriculumUnit>
}

/**
 * POST /v1/trainer/continuity/units/{unit_id}/usage request body — a
 * successor's feedback signal on a taught unit.
 */
export type UsageRequest = {
  signal_type: string
  value: number
  successor_user_id?: string
  notes?: string
}
