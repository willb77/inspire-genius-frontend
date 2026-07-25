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

// ── Guided Capture front-door ────────────────────────────────────────────────
// The "Start a capture" surface drives two Agent-Engine LLM endpoints
// (next-question / extract) plus the existing trainer-service persistence
// endpoints (taxonomy / sessions / turns / synthesize).

/** The task/responsibility node being mined in a capture. */
export type CaptureNode = {
  name: string
  node_type: string
}

/** One question→answer exchange in the running interview transcript. */
export type TranscriptExchange = {
  question: string
  answer: string
}

/**
 * POST /v1/agents/kce/capture/next-question request body (Agent Engine).
 * `is_first` asks Maven to open the interview with an empty transcript.
 */
export type NextQuestionRequest = {
  role_title: string
  node: CaptureNode
  transcript: TranscriptExchange[]
  is_first: boolean
}

/** POST /v1/agents/kce/capture/next-question response payload. */
export type NextQuestionResponse = {
  question: string
  coverage_note: string | null
}

/** POST /v1/agents/kce/capture/extract request body (Agent Engine). */
export type ExtractRequest = {
  role_title: string
  node: CaptureNode
  taxonomy_node_id: string
  transcript: TranscriptExchange[]
}

/**
 * A knowledge unit distilled from the interview transcript by Maven. This is
 * the raw extract shape — it becomes a {@link KnowledgeUnit} once persisted and
 * scored by the trainer-service on synthesize.
 */
export type ExtractedUnit = {
  category: string
  title: string
  body: string
  structured: unknown
  specificity: number
  consistency: number
  actionability: number
  tacit_richness: number
  taxonomy_node_id: string
}

/** POST /v1/agents/kce/capture/extract response payload. */
export type ExtractResponse = {
  units: ExtractedUnit[]
}

/** POST /v1/trainer/continuity/taxonomy request body. */
export type CreateTaxonomyRequest = {
  org_id: string
  role_title: string
  name: string
  node_type: string
  /** Optional parent node id — set when persisting a blueprint tree level-by-level. */
  parent_id?: string
}

/** POST /v1/trainer/continuity/taxonomy response payload (the taxonomy node). */
export type TaxonomyNode = {
  id: string
  org_id?: string | null
  role_title?: string | null
  name?: string | null
  node_type?: string | null
}

/** POST /v1/trainer/continuity/sessions/{id}/turns request body. */
export type RecordTurnRequest = {
  taxonomy_node_id: string
  question: string
  response: string
  coverage_delta?: number
}

// ── Automated blueprinting (Build B) ─────────────────────────────────────────
// The "Blueprint a role" surface drafts a role-knowledge taxonomy for review via
// one Agent-Engine LLM endpoint (Maven-tier), then persists the approved tree
// through the existing trainer-service taxonomy endpoint — one node per POST,
// parents before children so `parent_id` resolves.

export type BlueprintArchetype = "operational" | "managerial" | "executive"

/** A node the caller seeds the generator with (e.g. a future Job DNA export). */
export type BlueprintSeedNode = {
  ref: string
  name: string
  node_type: string
  section?: string | null
  parent_ref?: string | null
}

/** POST /v1/agents/kce/blueprint/generate request body (Agent Engine). */
export type BlueprintGenerateRequest = {
  role_title: string
  context?: string
  /** Omit to let the server classify the archetype from the title + context. */
  archetype?: BlueprintArchetype
  seed_nodes?: BlueprintSeedNode[]
}

/** A single drafted node in the generated blueprint tree (server-assigned refs). */
export type BlueprintNode = {
  ref: string
  parent_ref: string | null
  name: string
  node_type: string
  section: string | null
  depth: number
  rationale: string | null
}

/** POST /v1/agents/kce/blueprint/generate response payload. */
export type BlueprintGenerateResponse = {
  role_title: string
  archetype: BlueprintArchetype
  archetype_rationale: string
  sections: string[]
  nodes: BlueprintNode[]
}

// ── Seed from a Job Blueprint (Build C) ──────────────────────────────────────
// The blueprint-service exposes a role's knowledge-taxonomy seed derived from a
// Job DNA / Job Blueprint. Picking one here seeds the generate call so Maven
// enriches an existing role map instead of starting from a bare title.

/**
 * GET /v1/blueprint/job-dna/{blueprintId}/knowledge-taxonomy response payload
 * (blueprint-service — routes through the `api` instance, NOT the Agent Engine).
 * The envelope is camelCase, but its `nodes` are the snake_case
 * {@link BlueprintNode} shape (passed through as-is by the backend) and map
 * straight onto {@link BlueprintSeedNode} for the generate call.
 */
export type JobDnaTaxonomySeed = {
  blueprintId: string
  roleTitle: string
  archetype: string
  archetypeRationale: string
  sections: string[]
  nodes: BlueprintNode[]
}

/** Input to persist an approved blueprint tree as taxonomy nodes. */
export type PersistBlueprintRequest = {
  org_id: string
  role_title: string
  nodes: BlueprintNode[]
}

/** Result of persisting a blueprint: created-node count + the first root's id. */
export type PersistBlueprintResult = {
  created: number
  rootId: string | null
}
