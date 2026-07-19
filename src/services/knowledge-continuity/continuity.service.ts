import { api } from "@/lib/axios"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  ContinuityAnalytics,
  CurriculumDetail,
  CurriculumSummary,
  RegisterRiskRequest,
  ReviewQueue,
  RiskEntry,
  StartSessionRequest,
  StartSessionResponse,
  UsageRequest,
  ValidationRequest,
  ValidationResponse,
} from "@/types/knowledge-continuity"

const PREFIX = "/v1/trainer/continuity"

/** GET /v1/trainer/continuity/analytics — Program-Health summary. */
export async function getAnalytics(orgId?: string) {
  const { data } = await api.get<VerticalApiResponse<ContinuityAnalytics>>(
    `${PREFIX}/analytics`,
    { params: orgId ? { org_id: orgId } : {} }
  )
  return data
}

/** GET /v1/trainer/continuity/risk-register — full at-risk roster. */
export async function getRiskRegister(orgId?: string) {
  const { data } = await api.get<VerticalApiResponse<RiskEntry[]>>(
    `${PREFIX}/risk-register`,
    { params: orgId ? { org_id: orgId } : {} }
  )
  return data
}

/**
 * GET /v1/trainer/continuity/review-queue — units awaiting SME/practitioner
 * review, plus any unresolved contradictions between captured units.
 */
export async function getReviewQueue(orgId?: string) {
  const { data } = await api.get<VerticalApiResponse<ReviewQueue>>(
    `${PREFIX}/review-queue`,
    { params: orgId ? { org_id: orgId } : {} }
  )
  return data
}

/** POST /v1/trainer/continuity/units/{unitId}/validations — record a review verdict. */
export async function submitValidation(unitId: string, body: ValidationRequest) {
  const { data } = await api.post<VerticalApiResponse<ValidationResponse>>(
    `${PREFIX}/units/${unitId}/validations`,
    body
  )
  return data
}

/** POST /v1/trainer/continuity/risk-register — register an at-risk role/expert. */
export async function registerAtRiskRole(body: RegisterRiskRequest) {
  const { data } = await api.post<VerticalApiResponse<RiskEntry>>(
    `${PREFIX}/risk-register`,
    body
  )
  return data
}

/**
 * POST /v1/trainer/continuity/sessions — start a capture session. A real
 * (non-synthetic) expert session without a `consent_event_id` is rejected by
 * the backend with a 403 — callers should surface that clearly.
 */
export async function startCaptureSession(body: StartSessionRequest) {
  const { data } = await api.post<VerticalApiResponse<StartSessionResponse>>(
    `${PREFIX}/sessions`,
    body
  )
  return data
}

/**
 * GET /v1/trainer/continuity/curricula — published successor curricula, optionally
 * filtered to a single taxonomy.
 */
export async function getCurricula(taxonomyId?: string) {
  const { data } = await api.get<VerticalApiResponse<CurriculumSummary[]>>(
    `${PREFIX}/curricula`,
    { params: taxonomyId ? { taxonomy_id: taxonomyId } : {} }
  )
  return data
}

/**
 * GET /v1/trainer/continuity/curricula/{templateId} — a single curriculum with
 * its ordered modules and the `units_by_id` map used to resolve each item's
 * provenance citations. The backend 404s when the template is unknown.
 */
export async function getCurriculum(templateId: string) {
  const { data } = await api.get<VerticalApiResponse<CurriculumDetail>>(
    `${PREFIX}/curricula/${templateId}`
  )
  return data
}

/**
 * POST /v1/trainer/continuity/units/{unitId}/usage — record a successor's
 * feedback signal on a taught unit (e.g. still_true / no_longer_true /
 * clarity_flag).
 */
export async function recordUsage(unitId: string, body: UsageRequest) {
  const { data } = await api.post<VerticalApiResponse<unknown>>(
    `${PREFIX}/units/${unitId}/usage`,
    body
  )
  return data
}
