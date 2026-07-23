import { agentApi } from "@/lib/agentApi"
import { api } from "@/lib/axios"
import type {
  CoachActivityRow,
  CoachHome,
  CoachRecord,
  FellowStatus,
  HonorApiResponse,
  HonorEvaluateBody,
  HonorEvaluation,
  HonorFellowGoals,
  HonorFellowSources,
  HonorPrismReport,
  HonorFellow,
  HonorResume,
  HonorResumeBody,
  HonorResumeDisabled,
  HonorSourcesBulk,
  ScheduleEvent,
  TeamRecord,
} from "@/types/honor"

/**
 * Honor Foundation Coach Workbench — service layer (Simplified Vertical Model).
 *
 * Per IG_Vertical_Simplified_Model.docx, a vertical is frontend-only over the
 * UNCHANGED Core: NO new /v1/coach/* service, NO coach_member_assignments table,
 * NO ownership middleware. Every call below targets an EXISTING Core endpoint —
 * the same machinery GRANT and Summit already use. Dormant behind
 * USE_HONOR_MOCKS until each screen is flipped live.
 *
 * Coach roster reuses the GRANT-established agent-engine pattern
 * (src/services/grant/coach.service.ts hits /v1/agents/grant/coach/students*);
 * Honor mirrors it under the "honor" surface. The Evaluate chat reuses the
 * Meridian async-jobs transport (Summit pattern) — see the note on
 * runMemberEvaluation below — not a bespoke DAG.
 */

/** GRANT-style coach roster base in the agent-engine (reuse the same route pattern). */
const COACH_BASE = "/v1/agents/honor/coach/students"

/** Caseload — GET /v1/agents/honor/coach/students (JWT-scoped in the agent-engine, like GRANT). */
export async function getCaseload() {
  const { data } = await agentApi.get<HonorApiResponse<HonorFellow[]>>(COACH_BASE)
  return data
}

/** One assigned fellow — GET /v1/agents/honor/coach/students/{id}. */
export async function getFellow(id: string) {
  const { data } = await agentApi.get<HonorApiResponse<HonorFellow>>(`${COACH_BASE}/${id}`)
  return data
}

/** Add a fellow — POST /v1/agents/honor/coach/students (mirrors GRANT createCoachStudent). */
export async function createFellow(input: Partial<HonorFellow>) {
  const { data } = await agentApi.post<HonorApiResponse<HonorFellow>>(COACH_BASE, input)
  return data
}

/**
 * Invite a managed fellow — POST /v1/agents/honor/coach/students/{id}/invite.
 * Converts the managed roster row into a real IG user: mints `public.users`,
 * sends the magic-link intake, and grants the "honor" entitlement. Returns the
 * fellow re-keyed to their canonical sub (so subsequent subject-scoped writes —
 * assessments, documents — attach to the member, not the coach).
 */
export type InviteResult = HonorFellow & {
  /**
   * The POST-INVITE fellow id (the re-keyed canonical sub). The invite endpoint
   * returns the new id under `fellowId`, NOT `id` — subject-scoped writes must
   * target this or they 404 "fellow not found".
   */
  fellowId?: string
  userId?: string
  email?: string | null
  invitationSent?: boolean
  status?: string
}

/**
 * Convert/link a managed fellow to an IG user. `sendInvitation` controls whether
 * the coach wants the fellow notified now — the account is created either way;
 * the caller fires the magic-link intake email when `invitationSent` is true.
 */
export async function inviteFellow(id: string, keepCoachAccess = false, sendInvitation = true) {
  const { data } = await agentApi.post<HonorApiResponse<InviteResult>>(
    `${COACH_BASE}/${encodeURIComponent(id)}/invite`,
    { keepCoachAccess, sendInvitation },
  )
  return data
}

export type BulkInviteResult = {
  converted: number
  skipped: number
  errors: number
  results: Array<{ fellowId: string; status: string; email?: string | null; invitationSent?: boolean; message?: string }>
}

/**
 * Bulk-convert/invite several selected fellows in one request.
 *
 * Fellows are NOT IG login users — the invite sends a confirmation /
 * acknowledgement email (the backend composes + sends it now; the FE no longer
 * fires a magic link). `messageHtml` is the coach's formatted message body,
 * folded into the confirmation email server-side. Only sent when
 * `sendInvitation` is true; ignored otherwise.
 */
export async function inviteFellowsBulk(
  fellowIds: string[],
  keepCoachAccess = false,
  sendInvitation = true,
  messageHtml?: string,
) {
  const { data } = await agentApi.post<HonorApiResponse<BulkInviteResult>>(
    `${COACH_BASE}/invite-bulk`,
    {
      fellowIds,
      keepCoachAccess,
      sendInvitation,
      ...(messageHtml ? { messageHtml } : {}),
    },
  )
  return data
}

/**
 * Set a fellow's coaching status — PATCH …/{id}/status (ownership-gated coach
 * route). Lets the coach move a fellow between "intake-pending", "assessed", and
 * "invited" without re-running intake. Returns the fellow id + new status.
 */
export async function setFellowStatus(fellowId: string, status: FellowStatus) {
  const { data } = await agentApi.patch<HonorApiResponse<{ fellowId: string; status: FellowStatus }>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/status`,
    { status },
  )
  return data
}

/** Bulk CSV import — POST /v1/agents/honor/coach/students/import (mirrors GRANT importCoachStudents). */
export async function importFellows(rows: Array<Record<string, string>>) {
  const { data } = await agentApi.post<HonorApiResponse<{ added: number; updated: number }>>(
    `${COACH_BASE}/import`,
    { rows }
  )
  return data
}

/**
 * Coach home — no bespoke /v1/coach/home service (that would violate the model).
 * The dashboard is composed frontend-side from the roster + activity reads. This
 * wrapper is kept for the hook seam; in the live path the hook composes locally.
 */
export async function getCoachHome() {
  const { data } = await getCaseload()
  const fellows = data ?? []
  const counts = {
    assigned: fellows.length,
    assessed: fellows.filter((f) => f.status === "assessed").length,
    intakePending: fellows.filter((f) => f.status === "intake-pending").length,
  }
  const home: CoachHome = {
    coachName: "",
    coachTitle: "",
    counts,
    recentActivity: [],
    upcomingEvents: [],
  }
  return { data: home } as HonorApiResponse<CoachHome>
}

/**
 * Schedule — frontend-only in the Simplified Model (no bespoke /v1/coach/schedule).
 * Rendered from roster/session data; iCal/Google sync is a deferred Phase-2 stub.
 */
export async function getCoachSchedule() {
  return { data: [] as ScheduleEvent[] } as HonorApiResponse<ScheduleEvent[]>
}

/** Activity feed — reuse existing conversation/audit history (GET /v1/chat/... + audit-service). */
export async function getCoachActivity() {
  const { data } = await api.get<HonorApiResponse<CoachActivityRow[]>>("/v1/chat/history")
  return data
}

/** Administration coach list — reuse the existing team/roster read (dashboard-service). */
export async function getCoaches() {
  const { data } = await api.get<HonorApiResponse<CoachRecord[]>>("/api/manager/team")
  return data
}

export async function getTeams() {
  const { data } = await api.get<HonorApiResponse<TeamRecord[]>>("/api/manager/teams")
  return data
}

/**
 * Evaluate a member — reuse the Meridian async-jobs transport (the Summit pattern),
 * NOT a bespoke DAG. Submit to POST /v1/agents/chat/async with
 * context.surface="honor" so the server routes to the existing agents
 * (Aura/James/Nova/Ascend/Echo/Bridge/Grant) synthesized by Meridian, then poll
 * GET /v1/agents/chat/jobs/{job_id}. Wired in Phase 1 (see src/services/summit/
 * summitChat.ts for the reference implementation).
 */
export async function submitMemberEvaluation(prompt: string, memberId: string) {
  const { data } = await api.post<HonorApiResponse<{ job_id: string }>>("/v1/agents/chat/async", {
    message: prompt,
    context: { surface: "honor", intent: "member_evaluation", member_id: memberId },
  })
  return data
}

/**
 * Deterministic Fellow evaluation — POST /v1/agents/honor/coach/students/{id}/evaluate
 * (Phase 2). Returns the fully-scored, source-tagged backbone (objective +
 * goals-fit + ranked career/position fit, plus comparative/team when memberIds
 * are supplied). The FELLOW is the subject (ownership-gated server-side); the
 * scores are computed by the config-weighted scorer with NO model call, so the
 * UI renders them verbatim. Meridian narration is a separate step (honorChat).
 */
export async function evaluateFellow(fellowId: string, body: HonorEvaluateBody = {}) {
  const { data } = await agentApi.post<HonorApiResponse<HonorEvaluation>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/evaluate`,
    body,
  )
  return data
}

/**
 * The sources a fellow has submitted — assessments (by framework + score count)
 * and whether a résumé / bio is on file. Powers the Evaluate surface's per-fellow
 * document list + source selection.
 */
export async function getFellowSources(fellowId: string) {
  const { data } = await agentApi.get<HonorApiResponse<HonorFellowSources>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/sources`,
  )
  return data
}

/**
 * Per-fellow sources for several fellows in one request —
 * POST /v1/agents/honor/coach/students/sources-bulk. Powers the Evaluate
 * fellow grid's compact 10-artifact status row without an N+1 fan-out.
 */
export async function getFellowSourcesBulk(fellowIds: string[]) {
  const { data } = await agentApi.post<HonorApiResponse<{ sources: HonorSourcesBulk }>>(
    `${COACH_BASE}/sources-bulk`,
    { fellowIds },
  )
  return data
}

/** The fellow's stored goals & objectives — GET …/{id}/goals. */
export async function getFellowGoals(fellowId: string) {
  const { data } = await agentApi.get<HonorApiResponse<HonorFellowGoals>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/goals`,
  )
  return data
}

/** Set the fellow's goals & objectives text — PUT …/{id}/goals. */
export async function setFellowGoals(fellowId: string, text: string) {
  const { data } = await agentApi.put<HonorApiResponse<HonorFellowGoals>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/goals`,
    { text },
  )
  return data
}

/** The fellow's PRISM report scores from the imported CSV (or hasReport:false). */
export async function getFellowPrism(fellowId: string) {
  const { data } = await agentApi.get<HonorApiResponse<HonorPrismReport>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/prism`,
  )
  return data
}

/** Record a request for the fellow's PRISM report. */
export async function requestFellowPrism(fellowId: string) {
  const { data } = await agentApi.post<HonorApiResponse<{ fellowId: string; requested: boolean }>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/prism/request`,
    {},
  )
  return data
}

/**
 * Generate a private-sector résumé draft for a Fellow (Phase 5) —
 * POST /v1/agents/honor/coach/students/{id}/resume. The FELLOW is the subject
 * (ownership-gated server-side); the résumé is written from their PRISM +their
 * own uploaded résumé/bio, framed by the THF safe-translation rules. GATED by
 * the server `honor_resume` flag — returns `{ disabled: true }` while off, so the
 * UI falls back to a labeled sample layout until the safe-translation SME
 * sign-off activates it. Export/print/email reuse the Phase-4 routes (kind="resume").
 */
export async function generateResume(fellowId: string, body: HonorResumeBody = {}) {
  const { data } = await agentApi.post<HonorApiResponse<HonorResume | HonorResumeDisabled>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/resume`,
    body,
  )
  return data
}

// ── Phase 4: report export audit + email delivery ────────────────────────────

export type HonorReportKind = "evaluation" | "resume"
export type HonorExportAction = "download" | "print" | "email"

/**
 * Record a client-side export (download / print) for the audit trail — POST
 * …/{id}/report/exported. Fire-and-forget: emits `honor.report.exported` to
 * EventBridge (audit-service) server-side. NOT third-party messaging — no PDF
 * bytes leave the browser, this only logs that an export happened.
 */
export async function recordReportExport(
  fellowId: string,
  body: { kind: HonorReportKind; action: HonorExportAction },
) {
  const { data } = await agentApi.post<HonorApiResponse<{ recorded: boolean }>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/report/exported`,
    { ...body, format: "pdf" },
  )
  return data
}

export type EmailReportBody = {
  /** Recipient address (defaults to the fellow's email in the UI). */
  to: string
  cc?: string[]
  kind?: HonorReportKind
  subject?: string
  message?: string
  /** Suggested attachment filename, e.g. "honor-evaluation-marcus-reyes.pdf". */
  filename: string
  /** The rendered PDF, base64-encoded (no data: prefix). */
  pdfBase64: string
}

export type EmailReportResult = {
  sent: boolean
  messageId?: string
  /** True when the server-side `honor_report_email` flag is off (feature dark). */
  disabled?: boolean
}

/**
 * Email the branded report/résumé PDF to the fellow (or another authorized
 * recipient) — POST …/{id}/report/email. The PDF is rendered client-side and
 * sent as base64; the server delivers via SES and emits `honor.report.emailed`.
 * Gated by the server `honor_report_email` flag (returns `{disabled:true}` while
 * off) AND confirmed in the UI before any send — email is always-confirm.
 */
export async function emailReport(fellowId: string, body: EmailReportBody) {
  const { data } = await agentApi.post<HonorApiResponse<EmailReportResult>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/report/email`,
    body,
  )
  return data
}

/** Formats the multi-format export route can produce (via the Core docgen engine). */
export type HonorReportFormat =
  | "docx"
  | "pdf"
  | "pptx"
  | "xlsx"
  | "csv"
  | "md"
  | "html"
  | "txt"

export type GenerateReportBody = {
  kind?: HonorReportKind
  format: HonorReportFormat
  /** The deterministic evaluation backbone (HonorEvaluation) — optional. */
  evaluation?: HonorEvaluation | null
  /** Meridian's narrative in markdown — optional. */
  narrativeMarkdown?: string
  /** For kind="resume": the generated HonorResume — rendered clean + unbranded. */
  resume?: HonorResume | null
  fellowName?: string
  fellowTitle?: string
  fellowEmail?: string
  coachName?: string
  coachTitle?: string
  coachEmail?: string
  dateLabel?: string
}

export type GenerateReportResult = {
  downloadUrl: string
  filename: string
  format: HonorReportFormat
  contentType?: string
  expiresIn?: number
}

/**
 * Render a Fellow's evaluation/résumé to ANY supported format (Word · PDF ·
 * PowerPoint · Excel · CSV · Markdown · HTML) — POST …/{id}/report/generate.
 * The server reuses the Core document-generation engine (deterministic, no model
 * call), brands it with the THF cover + confidential footer, uploads to S3, and
 * returns a short-lived presigned download URL. Ownership-gated server-side.
 */
export async function generateReportDocument(fellowId: string, body: GenerateReportBody) {
  const { data } = await agentApi.post<HonorApiResponse<GenerateReportResult>>(
    `${COACH_BASE}/${encodeURIComponent(fellowId)}/report/generate`,
    body,
  )
  return data
}
