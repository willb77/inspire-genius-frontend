/**
 * PRISM Accuracy Scorer — API shapes.
 *
 * Mirrors `app/prism/accuracy_scorer.py` (report) and
 * `app/routes/prism_accuracy.py` (envelopes) on the agent-engine. The rubric is
 * fetched, not duplicated here, so what the operator reads is what the score
 * was made against.
 */

export type BandLabel = "Very low" | "Low" | "Moderate-low" | "Moderate" | "High" | "Very high"

export type ClaimKind = "scale" | "colour" | "colour_rank"

export type Verdict = "correct" | "partial" | "incorrect" | "unsupported" | "unverifiable"

export type Claim = {
  quote: string
  target: string
  kind: ClaimKind
  claimed_band: BandLabel | null
  claimed_value: number | null
  rank: "max" | "min" | null
  ambiguous_keys: string[]
  source: "lexical" | "llm"
}

export type ClaimVerdict = {
  claim: Claim
  actual_value: number | null
  actual_band: BandLabel | null
  verdict: Verdict
  band_distance: number | null
  numeric_error: number | null
  inverted: boolean
  note: string
  resolved_target: string | null
  /** "guide" = the PRISM intensity scale (behaviours + colours); "rubric" = IG's six bands. */
  band_scheme?: "guide" | "rubric"
  /** Added by the route: the scale label, or the colour's display name. */
  label: string
  /** Added by the route: the rubric group, or "Colour". */
  group: string
}

export type AccuracyMetrics = {
  n_claims: number
  n_verifiable: number
  n_correct: number
  n_partial: number
  n_incorrect: number
  n_unsupported: number
  n_unverifiable: number
  claim_precision: number | null
  direction_accuracy: number | null
  fabrication_rate: number | null
  numeric_mae: number | null
  salience_recall: number | null
  salient_scales: string[]
  salient_labels: string[]
  salient_engaged: string[]
  canon_violations: string[]
  interpretive_fidelity: number | null
}

export type AccuracyReport = {
  scorable: boolean
  reason: string
  pas: number | null
  grade: "A" | "B" | "C" | "D" | "F" | null
  caps_applied: string[]
  metrics: AccuracyMetrics
  verdicts: ClaimVerdict[]
  mentions: string[]
  profile_coverage: number
  profile_conflicted: boolean
  extraction: "lexical" | "llm"
}

export type SubjectSalient = { key: string; label: string; group: string; value: number; band: BandLabel }

export type SubjectSummary = {
  user_id: string
  name?: string | null
  email?: string | null
  coverage: number
  scales_on_file?: number
  missing?: number
  conflicted: boolean
  conflicts?: string[]
  from_legacy_rows?: boolean
  assessment_ids?: string[]
  colours: Record<string, number> | null
  salient: SubjectSalient[]
}

export type LlmInfo = {
  used: boolean
  reason?: string
  model?: string
  input_tokens?: number
  output_tokens?: number
  claims?: number
  anchored_scales?: string[]
}

export type TurnInfo = {
  turn_id: string
  session_id: string | null
  agent_name: string | null
  prompt_text: string | null
  response_text: string
}

export type ScoreResult = {
  report: AccuracyReport
  subject: SubjectSummary
  llm: LlmInfo
  turn?: TurnInfo
}

export type ScoreRequest = {
  subject_user_id?: string
  turn_id?: string
  response_text?: string
  prompt_text?: string
  use_llm?: boolean
  salient_k?: number
}

export type SessionScoreRequest = {
  session_id: string
  subject_user_id?: string
  use_llm?: boolean
  salient_k?: number
  limit?: number
}

export type SessionTurnRow = {
  turn_id: string
  agent_name: string | null
  created_at: string
  scorable: boolean
  reason: string
  pas: number | null
  grade: string | null
  caps_applied: string[]
  n_claims: number
  n_inverted: number
  n_unsupported: number
  canon_violations: string[]
  preview: string
  /** Whether the model graded this turn (session scoring with the model on). */
  llm_used?: boolean
  /** Why the model did not grade it, or a caveat when it did (e.g. reply truncated). */
  llm_note?: string | null
}

/** How much of a session the model pass covered before the gateway budget ran out. */
export type SessionLlmSummary = {
  requested: boolean
  used: boolean
  model?: string | null
  turns_graded: number
  turns_not_finished: number
  turns_failed: number
  budget_seconds: number
  elapsed_seconds: number | null
  input_tokens?: number
  output_tokens?: number
  reason?: string
}

export type Aggregate = {
  n_turns: number
  n_scored: number
  n_ungrounded: number
  n_unscorable_other: number
  mean_pas: number | null
  median_pas: number | null
  min_pas: number | null
  pass_rate: number | null
  grades: Record<string, number>
  total_claims: number
  total_inverted: number
  total_unsupported: number
  total_canon_violations: number
}

export type SessionScoreResult = {
  session_id: string
  subject: SubjectSummary | null
  aggregate: Aggregate
  turns: SessionTurnRow[]
  llm?: SessionLlmSummary
}

export type RubricCriterion = {
  key: string
  name: string
  weight: number
  measures: string
  scoring: string
  target: string
}

export type Rubric = {
  name: string
  version: string
  purpose: string
  source?: { document: string; content_sha256: string; applies_to: string; not_covered: string }
  criteria: RubricCriterion[]
  bands: { scheme: "guide" | "rubric"; low: number; high: number; label: BandLabel; meaning: string }[]
  band_schemes?: Record<"guide" | "rubric", string>
  opposites?: { a: string; b: string }[]
  grades: { min: number; grade: string }[]
  caps: { key: string; cap: number; rule: string }[]
  not_scorable: string[]
  usage: string[]
  metrics: Record<string, string>
}

export type SubjectRow = {
  user_id: string
  name: string | null
  email: string | null
  assessments: number
  scores: number
  latest: string | null
}

/** One conversation worth scoring, as the page lists it. */
export type ConversationRow = {
  session_id: string
  user_id: string
  name: string | null
  email: string | null
  first_seen_at: string
  last_seen_at: string
  ig_turns: number
  message_count: number
  agents: string[]
  opening_message: string
}
