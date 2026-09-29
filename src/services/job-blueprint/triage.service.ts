import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { Candidate, InsightPackage, InterviewStep } from '@/types/job-blueprint'

const BASE = '/v1/blueprint/triage'

export type PipelineStats = {
  total: number
  byStep: Record<string, number>
  avgVariation: number
  strongFitCount: number
}

export const triageService = {
  submitIntake(data: { jobId: string; name: string; email: string; code?: string }) {
    return api.post<BaseApiResponse<Candidate>>(`${BASE}/intake`, data)
  },

  getPipeline(jobId: string, compare?: boolean) {
    return api.get<BaseApiResponse<Candidate[]>>(`${BASE}/pipeline/${jobId}`, {
      params: compare ? { compare: true } : undefined,
    })
  },

  getCandidate(candidateId: string) {
    return api.get<BaseApiResponse<Candidate>>(`${BASE}/candidate/${candidateId}`)
  },

  advanceCandidate(candidateId: string) {
    return api.post<BaseApiResponse<Candidate>>(`${BASE}/advance/${candidateId}`)
  },

  /**
   * JS-12 — set the candidate's pipeline step from the interview by NAME.
   * Forward-only and idempotent on the server: the returned `status` says
   * whether anything moved. Only the two interview steps are sendable.
   */
  setInterviewStep(candidateId: string, data: { step: InterviewStep; interviewSessionId?: string }) {
    return api.post<BaseApiResponse<Candidate>>(`${BASE}/interview-step/${candidateId}`, data)
  },

  getStats() {
    return api.get<BaseApiResponse<PipelineStats>>(`${BASE}/stats`)
  },

  getInsights(candidateId: string) {
    return api.get<BaseApiResponse<InsightPackage>>(`${BASE}/candidate/${candidateId}/insights`)
  },
}
