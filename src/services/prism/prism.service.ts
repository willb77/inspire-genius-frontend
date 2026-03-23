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
export function initiateAssessment(data: InitiateAssessmentRequest) {
  return api.post<BaseApiResponse<InitiateAssessmentResponse>>(
    `${BASE}/initiate`,
    data,
  )
}

/** Poll assessment status */
export function getAssessmentStatus(assessmentId: string) {
  return api.get<BaseApiResponse<AssessmentStatusResponse>>(
    `${BASE}/status/${assessmentId}`,
  )
}

/** Fetch completed report (PDF + structured data) */
export function getAssessmentReport(assessmentId: string) {
  return api.get<BaseApiResponse<PrismReportResponse>>(
    `${BASE}/report/${assessmentId}`,
  )
}

/** Get all assessments for a user */
export function getUserAssessments(userId: string) {
  return api.get<
    BaseApiResponse<{ assessments: PrismAssessment[]; total: number }>
  >(`${BASE}/history/${userId}`)
}

/** Unlock/pay for a report */
export function unlockAssessment(data: UnlockAssessmentRequest) {
  return api.post<BaseApiResponse<AssessmentStatusResponse>>(
    `${BASE}/unlock/${data.assessmentId}`,
    data,
  )
}

/** Upgrade report to higher tier */
export function upgradeAssessment(data: UpgradeAssessmentRequest) {
  return api.post<BaseApiResponse<AssessmentStatusResponse>>(
    `${BASE}/upgrade/${data.assessmentId}`,
    data,
  )
}

/** Submit callback — called when user returns from PRISM questionnaire */
export function submitQuestionnaireCallback(assessmentId: string) {
  return api.post<BaseApiResponse<AssessmentStatusResponse>>(
    `${BASE}/submit`,
    { assessmentId },
  )
}
