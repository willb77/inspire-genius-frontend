import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type {
  InitiateAssessmentRequest,
  InitiateAssessmentResponse,
  AssessmentStatusResponse,
  PrismReportResponse,
  PrismAssessment,
  UnlockAssessmentRequest,
  UpgradeAssessmentRequest,
} from '@/types/prism/assessment-types'

const BASE = '/v1/prism'

/** Initiate a new PRISM assessment */
export async function initiateAssessment(data: InitiateAssessmentRequest) {
  const resp = await api.post<BaseApiResponse<InitiateAssessmentResponse>>(
    `${BASE}/initiate`,
    data,
  )
  return resp.data
}

/** Poll assessment status */
export async function getAssessmentStatus(assessmentId: string) {
  const resp = await api.get<BaseApiResponse<AssessmentStatusResponse>>(
    `${BASE}/status/${assessmentId}`,
  )
  return resp.data
}

/** Fetch completed report (PDF + structured data) */
export async function getAssessmentReport(assessmentId: string) {
  const resp = await api.get<BaseApiResponse<PrismReportResponse>>(
    `${BASE}/report/${assessmentId}`,
  )
  return resp.data
}

/** Get all assessments for a user */
export async function getUserAssessments(userId: string) {
  const resp = await api.get<
    BaseApiResponse<{ assessments: PrismAssessment[]; total: number }>
  >(`${BASE}/history/${userId}`)
  return resp.data
}

/** Unlock/pay for a report */
export async function unlockAssessment(data: UnlockAssessmentRequest) {
  const resp = await api.post<BaseApiResponse<AssessmentStatusResponse>>(
    `${BASE}/unlock/${data.assessmentId}`,
    data,
  )
  return resp.data
}

/** Upgrade report to higher tier */
export async function upgradeAssessment(data: UpgradeAssessmentRequest) {
  const resp = await api.post<BaseApiResponse<AssessmentStatusResponse>>(
    `${BASE}/upgrade/${data.assessmentId}`,
    data,
  )
  return resp.data
}

/** Trigger PRISM report vectorization for RAG retrieval */
export async function vectorizePrismReport(
  userId: string,
  prismData?: Record<string, unknown>,
  assessmentId?: string,
) {
  const { agentApi } = await import('@/lib/agentApi')
  const resp = await agentApi.post('/v1/agents/documents/vectorize-prism', {
    user_id: userId,
    prism_data: prismData ?? null,
    assessment_id: assessmentId ?? null,
  })
  return resp.data
}

/** Import a PRISM report from a file (PDF, DOCX, CSV, XLS/XLSX) */
export async function importPrismFile(userId: string, file: File) {
  const { agentApi } = await import('@/lib/agentApi')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', userId)
  const resp = await agentApi.post('/v1/agents/documents/import-prism', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return resp.data
}

/**
 * Check whether a customer already exists in PRISM by email / external ident.
 * When `exists === true` a new report can still be requested for them without
 * recreating the account; the backend returns an optional `action_url`.
 */
export async function checkExistingCustomer(params: {
  email?: string
  externalIdent?: string
  questionnaireTypeId: number
  forename?: string
  surname?: string
}) {
  // Backend returns the raw CheckCustomerResponse (NOT a BaseApiResponse
  // envelope), consistent with the sibling /v1/prism request endpoints.
  const { data } = await api.post<{
    exists: boolean
    action_url?: string
    response_message?: string
  }>(`${BASE}/check-customer`, params)
  return data
}

/** Submit callback — called when user returns from PRISM questionnaire */
export async function submitQuestionnaireCallback(assessmentId: string) {
  const resp = await api.post<BaseApiResponse<AssessmentStatusResponse>>(
    `${BASE}/submit`,
    { assessmentId },
  )
  return resp.data
}
