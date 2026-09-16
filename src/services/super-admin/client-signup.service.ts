/**
 * Client Sign-Up & SOW service — raw Axios calls to `/v1/client-signup/*`.
 *
 * Uses the `api` instance (API Gateway → client-signup-service Lambda), NOT
 * `agentApi`: this is a microservice behind the shared HTTP API, not the agent
 * engine. Returns the raw JSON the service emits — it does not use the
 * `BaseApiResponse<T>` envelope, matching broadcast-service and its siblings.
 *
 * No React here, per the Service → Hook → Component rule.
 */
import { api } from "@/lib/axios"
import type {
  Activity,
  ActivityCreatePayload,
  ChangeOrder,
  ClientSignupAccess,
  Engagement,
  EngagementCreatePayload,
  EngagementUpdatePayload,
  GateResult,
  InvoicingDocument,
  InvoicingSummary,
  Pipeline,
  ProcessReference,
  Sow,
  SowDocument,
  StageChangePayload,
} from "@/types/client-signup"

const BASE = "/v1/client-signup"

const engagementUrl = (id: string) => `${BASE}/engagements/${encodeURIComponent(id)}`

// ─── Access + process reference ──────────────────────────────────

export async function getClientSignupAccess(): Promise<ClientSignupAccess> {
  const { data } = await api.get<ClientSignupAccess>(`${BASE}/access/me`)
  return data
}

/**
 * The whole process as data — stages, gates, field rules, the 14 SOW sections,
 * the checklist and the RACI.
 *
 * The surface renders from this rather than from a local copy, so the document
 * has one implementation. Cache it hard: it changes only when the process does.
 */
export async function getProcessReference(): Promise<ProcessReference> {
  const { data } = await api.get<ProcessReference>(`${BASE}/process`)
  return data
}

// ─── Pipeline ────────────────────────────────────────────────────

export async function listEngagements(params?: {
  stage?: string
  ownerEmail?: string
  includeClosed?: boolean
  limit?: number
}): Promise<Pipeline> {
  const { data } = await api.get<Pipeline>(`${BASE}/engagements`, {
    params: {
      stage: params?.stage,
      owner_email: params?.ownerEmail,
      include_closed: params?.includeClosed,
      limit: params?.limit,
    },
  })
  return data
}

export async function getEngagement(id: string): Promise<Engagement> {
  const { data } = await api.get<Engagement>(engagementUrl(id))
  return data
}

export async function createEngagement(
  payload: EngagementCreatePayload,
): Promise<Engagement> {
  const { data } = await api.post<Engagement>(`${BASE}/engagements`, payload)
  return data
}

export async function updateEngagement(
  id: string,
  payload: EngagementUpdatePayload,
): Promise<Engagement> {
  const { data } = await api.patch<Engagement>(engagementUrl(id), payload)
  return data
}

/**
 * Move an engagement through the pipeline.
 *
 * Rejects with HTTP 409 when the §4 gates are not met; the error body is a
 * `GateResult` listing EVERY failed gate and missing field, not just the first.
 */
export async function changeStage(
  id: string,
  payload: StageChangePayload,
): Promise<Engagement> {
  const { data } = await api.post<Engagement>(`${engagementUrl(id)}/stage`, payload)
  return data
}

/** Dry-run the gate, so the surface can show what is outstanding before committing. */
export async function canAdvance(id: string, targetStage: string): Promise<GateResult> {
  const { data } = await api.get<GateResult>(
    `${engagementUrl(id)}/can-advance/${encodeURIComponent(targetStage)}`,
  )
  return data
}

// ─── Activities ──────────────────────────────────────────────────

export async function listActivities(id: string, limit = 200): Promise<Activity[]> {
  const { data } = await api.get<Activity[]>(`${engagementUrl(id)}/activities`, {
    params: { limit },
  })
  return data
}

export async function addActivity(
  id: string,
  payload: ActivityCreatePayload,
): Promise<Activity> {
  const { data } = await api.post<Activity>(`${engagementUrl(id)}/activities`, payload)
  return data
}

// ─── SOW ─────────────────────────────────────────────────────────

/** The current SOW, or null when none has been started. */
export async function getSow(id: string): Promise<Sow | null> {
  const { data } = await api.get<Sow | null>(`${engagementUrl(id)}/sow`)
  return data
}

export async function listSowVersions(id: string): Promise<Sow[]> {
  const { data } = await api.get<Sow[]>(`${engagementUrl(id)}/sows`)
  return data
}

/**
 * Save the working draft.
 *
 * Saving against a SENT version opens the next one rather than editing it —
 * §7's "never edit a sent version in place". The returned `version` tells the
 * surface which one it is now editing.
 */
export async function saveSow(
  id: string,
  document: SowDocument,
  opts?: { title?: string; changeSummary?: string },
): Promise<Sow> {
  const { data } = await api.put<Sow>(`${engagementUrl(id)}/sow`, {
    document,
    title: opts?.title,
    change_summary: opts?.changeSummary,
  })
  return data
}

/** Rejects with 409 + a `SowValidation` when the document is incomplete. */
export async function sendSow(id: string): Promise<Sow> {
  const { data } = await api.post<Sow>(`${engagementUrl(id)}/sow/send`)
  return data
}

export async function signSow(
  id: string,
  opts?: { signedAt?: string; signedDocumentUrl?: string },
): Promise<Sow> {
  const { data } = await api.post<Sow>(`${engagementUrl(id)}/sow/sign`, {
    signed_at: opts?.signedAt,
    signed_document_url: opts?.signedDocumentUrl,
  })
  return data
}

// ─── Invoicing summary ───────────────────────────────────────────

export async function getInvoicingSummary(id: string): Promise<InvoicingSummary | null> {
  const { data } = await api.get<InvoicingSummary | null>(`${engagementUrl(id)}/invoicing`)
  return data
}

/**
 * Pre-fill Appendix B from the signed SOW.
 *
 * Derived rather than re-typed: re-keying a payment schedule is where the SOW
 * and the summary drift apart, and the reconciliation check would then be
 * catching a transcription slip instead of a real disagreement.
 */
export async function draftInvoicingSummary(id: string): Promise<InvoicingDocument> {
  const { data } = await api.post<InvoicingDocument>(`${engagementUrl(id)}/invoicing/draft`)
  return data
}

export async function saveInvoicingSummary(
  id: string,
  document: InvoicingDocument,
  changeNote?: string,
): Promise<InvoicingSummary> {
  const { data } = await api.put<InvoicingSummary>(`${engagementUrl(id)}/invoicing`, {
    document,
    change_note: changeNote,
  })
  return data
}

/**
 * Hand the summary to Paula.
 *
 * Rejects with 409 + an `InvoicingValidation` when it is incomplete or does not
 * reconcile to the SOW total. That equality is the last check before an invoice
 * is raised from it.
 */
export async function sendInvoicingSummary(id: string): Promise<InvoicingSummary> {
  const { data } = await api.post<InvoicingSummary>(`${engagementUrl(id)}/invoicing/send`)
  return data
}

export async function confirmInvoicingSummary(
  id: string,
  firstInvoiceDate?: string,
): Promise<InvoicingSummary> {
  const { data } = await api.post<InvoicingSummary>(
    `${engagementUrl(id)}/invoicing/confirm`,
    { first_invoice_date: firstInvoiceDate },
  )
  return data
}

// ─── Change orders ───────────────────────────────────────────────

export async function listChangeOrders(id: string): Promise<ChangeOrder[]> {
  const { data } = await api.get<ChangeOrder[]>(`${engagementUrl(id)}/change-orders`)
  return data
}

export async function createChangeOrder(
  id: string,
  payload: {
    description: string
    co_number?: string
    schedule_impact?: string
    fee_delta_cents?: number
  },
): Promise<ChangeOrder> {
  const { data } = await api.post<ChangeOrder>(`${engagementUrl(id)}/change-orders`, payload)
  return data
}

export async function signChangeOrder(id: string, coId: string): Promise<ChangeOrder> {
  const { data } = await api.post<ChangeOrder>(
    `${engagementUrl(id)}/change-orders/${encodeURIComponent(coId)}/sign`,
  )
  return data
}
