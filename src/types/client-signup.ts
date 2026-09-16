/**
 * Client Sign-Up & SOW types — the shapes `/v1/client-signup/*` returns.
 *
 * These describe the WIRE, not the process. The process itself (stage names,
 * gate labels, required fields, the 14 SOW sections, the checklist, the RACI)
 * is fetched from `GET /v1/client-signup/process` and rendered from there,
 * rather than restated here. One implementation of
 * `docs/operations/IG_Client_Signup_and_SOW_Process.docx` means an amendment
 * lands in one place; a second copy in TypeScript would drift on the first
 * revision, and nobody could tell which half was stale.
 *
 * Money is always integer CENTS (`*_cents`). Format it for display; never do
 * arithmetic on a float dollar amount. The service reconciles the invoicing
 * summary against the SOW with an exact equality, and a float round-trip here
 * would put a one-cent discrepancy on screen that does not exist.
 */

/** Pipeline stage keys — the document's §2 names, as stored. */
export type EngagementStage =
  | "lead"
  | "qualified"
  | "discovery"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "delivery"
  | "complete"
  | "closed_lost"

export type ActivityKind =
  | "meeting"
  | "call"
  | "demo"
  | "email"
  | "document"
  | "stage_change"
  | "note"

export type SowStatus = "draft" | "sent" | "signed" | "superseded"

/** A required field that is still empty (§3, Table 3). */
export interface MissingField {
  name: string
  label: string
  note?: string
}

/** A "must be true" condition from the §4 stage-change checklist. */
export interface GateCheck {
  key: string
  label: string
}

/** Why a stage change is or is not allowed. */
export interface GateResult {
  allowed: boolean
  target_stage: string
  /** Set when the move itself is illegal (backwards, skipping, terminal). */
  error: string | null
  failed_gates: GateCheck[]
  missing_fields: MissingField[]
}

/** One row of the §10 one-page checklist, computed from the record. */
export interface ChecklistRow {
  key: string
  step: string
  done_when: string
  done: boolean
}

/** The pipeline list row. Trimmed — no document bodies. */
export interface EngagementListItem {
  id: string
  opportunity_name: string
  company_name: string
  stage: EngagementStage
  stage_label: string
  service_line: string | null
  industry: string | null
  owner_email: string
  estimated_value_cents: number
  expected_close_date: string | null
  next_action: string | null
  next_action_due: string | null
  last_activity_at: string
  /** No activity for ten business days (§4). Derived server-side. */
  at_risk: boolean
}

export interface PipelineSummary {
  by_stage: Record<string, number>
  /** Open PIPELINE only — excludes won and closed-lost. */
  open_value_cents: number
  won_value_cents: number
  at_risk: number
  overdue_actions: number
}

export interface Pipeline {
  engagements: EngagementListItem[]
  summary: PipelineSummary
}

export interface Engagement {
  id: string
  opportunity_name: string
  company_name: string
  company_legal_name: string | null
  company_website: string | null
  primary_contact_name: string | null
  primary_contact_title: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  decision_maker_name: string | null
  decision_maker_title: string | null
  decision_maker_email: string | null
  industry: string | null
  industry_subtype: string | null
  lead_source: string | null
  service_line: string | null
  business_problem: string | null
  qualification_call_at: string | null
  qualification_notes: string | null
  estimated_value_cents: number
  expected_close_date: string | null
  stage: EngagementStage
  stage_label: string
  discovery_scheduled_at: string | null
  scope_summary: string | null
  scope_summary_url: string | null
  scope_summary_reviewed_with_client: boolean
  integrations_required: string[]
  integrations_confirmed: boolean
  competitors: string[]
  internal_estimate_approved: boolean
  sow_sent_at: string | null
  client_feedback_at: string | null
  sow_signed_at: string | null
  project_record_created: boolean
  kickoff_scheduled_at: string | null
  invoicing_summary_sent_at: string | null
  invoicing_summary_confirmed_at: string | null
  go_live_at: string | null
  go_live_notified_at: string | null
  milestones: Milestone[]
  next_action: string | null
  next_action_due: string | null
  lost_reason_code: string | null
  lost_note: string | null
  owner_email: string
  created_by: string
  created_at: string
  updated_at: string
  last_activity_at: string

  // ── Derived server-side, never stored ──
  at_risk: boolean
  missing_fields: MissingField[]
  checklist: ChecklistRow[]
  /** Things §8 says the invoicing contact must be told that they have not been told. */
  pending_invoicing: string[]
  next_stage: EngagementStage | null
  can_advance: GateResult | null
}

export interface Milestone {
  id?: string
  name?: string
  due?: string
  accepted_at?: string | null
  invoicing_notified_at?: string | null
}

export interface Activity {
  id: string
  engagement_id: string
  kind: ActivityKind
  summary: string
  detail: string | null
  payload: Record<string, unknown>
  occurred_at: string
  actor_email: string
  created_at: string
}

// ─── SOW (§6, Appendix A) ────────────────────────────────────────

export interface SowDeliverable {
  id?: string
  name?: string
  description?: string
  format?: string
  due?: string
  acceptance_criterion?: string
}

export interface SowAdditionalService {
  service?: string
  description?: string
  /** "Included" | "Optional" — only Included counts toward the total. */
  inclusion?: string
  fee_cents?: number
}

export interface SowFeeLine {
  label?: string
  basis?: string
  amount_cents?: number
}

export interface SowRecurringLine {
  item?: string
  amount_cents?: number
  frequency?: string
  advance_or_arrears?: string
  starts?: string
  ends?: string
}

export interface SowPaymentRow {
  trigger?: string
  issue_date?: string
  line_description?: string
  amount_cents?: number
  terms?: string
}

/**
 * The Appendix A document.
 *
 * `sections` is keyed by section NUMBER as a string ("1".."14") because it
 * survives a JSON round trip; the titles and guidance come from the process
 * reference, not from here.
 */
export interface SowDocument {
  sow_number?: string
  client_legal_name?: string
  client_address?: string
  client_signer_name?: string
  start_date?: string
  end_date?: string
  payment_terms?: string
  taxes?: string
  expenses?: string
  late_payment?: string
  sections?: Record<string, string>
  deliverables?: SowDeliverable[]
  additional_services?: SowAdditionalService[]
  fee_lines?: SowFeeLine[]
  recurring_lines?: SowRecurringLine[]
  payment_schedule?: SowPaymentRow[]
}

export interface SowValidation {
  ok: boolean
  /** Section numbers with no text. "Not applicable" counts as text (§6). */
  empty_sections: number[]
  missing_header: string[]
  errors: string[]
}

export interface Sow {
  id: string
  engagement_id: string
  version: number
  sow_number: string | null
  title: string | null
  status: SowStatus
  document: SowDocument
  total_one_time_cents: number
  total_recurring_cents: number
  change_summary: string | null
  sent_at: string | null
  signed_at: string | null
  signed_document_url: string | null
  created_by: string
  created_at: string
  updated_at: string
  validation: SowValidation | null
}

// ─── Invoicing summary (§8, Appendix B) ──────────────────────────

export interface InvoiceRow {
  n?: number
  trigger?: string
  issue_date?: string
  line_description?: string
  amount_cents?: number
  terms?: string
}

export interface RecurringRow {
  item?: string
  amount_cents?: number
  frequency?: string
  advance_or_arrears?: string
  starts?: string
  ends?: string
}

export interface InvoicingDocument {
  client_legal_name?: string
  billing_address?: string
  billing_contact_name?: string
  billing_contact_email?: string
  billing_contact_phone?: string
  po_number?: string
  invoice_delivery?: string
  sow_number?: string
  sow_title?: string
  signed_on?: string
  start_date?: string
  end_date?: string
  work_description?: string
  engagement_lead?: string
  signed_sow_location?: string
  invoices?: InvoiceRow[]
  recurring?: RecurringRow[]
  payment_terms?: string
  late_payment?: string
  taxes?: string
  expenses?: string
  currency?: string
  notes_for_invoicing?: string
}

export interface InvoicingValidation {
  ok: boolean
  /** Blocking. Includes the reconciliation against the SOW total. */
  errors: string[]
  /** Non-blocking (e.g. a recurring line with no start date). */
  warnings: string[]
}

export interface InvoicingSummary {
  id: string
  engagement_id: string
  sow_id: string | null
  version: number
  document: InvoicingDocument
  total_one_time_cents: number
  change_note: string | null
  sent_at: string | null
  confirmed_at: string | null
  first_invoice_date: string | null
  created_by: string
  created_at: string
  validation: InvoicingValidation | null
}

export interface ChangeOrder {
  id: string
  engagement_id: string
  sow_id?: string | null
  co_number: string
  description: string
  schedule_impact?: string | null
  fee_delta_cents: number
  signed_at: string | null
  summary_reissued_at: string | null
  created_by?: string
  created_at?: string
}

// ─── The process reference ───────────────────────────────────────

export interface ProcessStage {
  key: EngagementStage
  label: string
  terminal: boolean
  gates: GateCheck[]
}

export interface ProcessFieldRule {
  name: string
  label: string
  /** A stage key, or "all" for every open stage. */
  required_at: string
  note: string
}

export interface ProcessSowSection {
  number: number
  title: string
  guidance: string
}

export interface RaciRow {
  activity: string
  engagement_lead: string
  delivery_lead: string
  invoicing: string
  principal: string
}

export interface ProcessReference {
  stages: ProcessStage[]
  fields: ProcessFieldRule[]
  industries: string[]
  lead_sources: string[]
  service_lines: { key: string; label: string }[]
  lost_reason_codes: string[]
  sow_sections: ProcessSowSection[]
  checklist: { key: string; step: string; done_when: string }[]
  raci: { roles: string[]; rows: RaciRow[] }
  at_risk_business_days: number
  source_document: string
}

export interface ClientSignupAccess {
  authorized: boolean
  email: string
  role: string
}

// ─── Request payloads ────────────────────────────────────────────

export interface EngagementCreatePayload {
  company_name: string
  company_website?: string | null
  company_legal_name?: string | null
  primary_contact_name?: string | null
  primary_contact_title?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
  industry?: string | null
  industry_subtype?: string | null
  lead_source?: string | null
  service_line?: string | null
  next_action?: string | null
  next_action_due?: string | null
  owner_email?: string | null
}

/**
 * A partial update. `stage` is deliberately absent — the server forbids it on
 * this endpoint, because a PATCH that could write the stage would make the §4
 * gates advisory. Stage moves go through `changeStage`.
 */
export type EngagementUpdatePayload = Partial<
  Omit<
    Engagement,
    | "id" | "stage" | "stage_label" | "opportunity_name"
    | "at_risk" | "missing_fields" | "checklist" | "pending_invoicing"
    | "next_stage" | "can_advance"
    | "created_at" | "updated_at" | "last_activity_at" | "created_by"
    | "sow_sent_at" | "sow_signed_at"
    | "invoicing_summary_sent_at" | "invoicing_summary_confirmed_at"
    | "lost_reason_code" | "lost_note"
  >
>

export interface StageChangePayload {
  target_stage: EngagementStage
  note?: string
  lost_reason_code?: string
  lost_note?: string
}

export interface ActivityCreatePayload {
  kind: ActivityKind
  summary: string
  detail?: string
  occurred_at?: string
}

/**
 * The error body a refused gate returns (HTTP 409).
 *
 * Every shape carries the FULL outstanding list rather than the first failure,
 * so the surface can show everything at once.
 */
export type ClientSignupRefusal =
  | GateResult
  | SowValidation
  | InvoicingValidation
  | { errors: string[] }
