// Job DNA — "Draft a blueprint" front-door types.
//
// The draft flow asks the Agent Engine to benchmark all 22 PRISM dimensions for
// a role from a title + free-text context, then lets the user tweak and save it
// through the same create → finalize path the manual wizard uses.

import type { DimensionCategory } from "./job-dna"

/** Role-shape hint sent to the drafter. Empty string → auto-detect server-side. */
export type DraftArchetype = "" | "operational" | "managerial" | "executive"

/**
 * The tier label the drafter assigns each dimension (display-only). Distinct
 * from the persisted {@link import("./job-dna").InterpretationBand}; shown as a
 * Badge in the review step.
 */
export type DraftInterpretation = "critical" | "counter-productive" | "unimportant"

/** POST /v1/agents/blueprint/draft-benchmark request. */
export type DraftBenchmarkRequest = {
  role_title: string
  context?: string
  archetype?: string
}

/** A single benchmarked dimension as returned by the drafter (snake_case wire shape). */
export type DraftDimension = {
  dimension_id: number
  dimension_name: string
  category: DimensionCategory
  final_benchmark_percent: number
  rank_percent: number
  rate_value: number
  rank_position: number
  interpretation: DraftInterpretation
}

/** POST /v1/agents/blueprint/draft-benchmark response. */
export type DraftBenchmarkResponse = {
  role_title: string
  archetype: string
  rationale: string
  behaviors: DraftDimension[]
  aptitudes: DraftDimension[]
  core_traits: DraftDimension[]
}

/**
 * A role surfaced in the cross-vertical "Role" dropdown. Roles authored in Job
 * DNA and roles blueprinted in the Knowledge Continuity Engine are aggregated
 * and de-duped by title so either vertical's work is reachable here.
 */
export type AggregatedRole = {
  role_title: string
  source: "job-dna" | "kce"
  /** Present for Job DNA rows — the blueprint id used to open its detail page. */
  id?: string
  /** Present for KCE rows — how many knowledge areas the saved role has. */
  node_count?: number
}
