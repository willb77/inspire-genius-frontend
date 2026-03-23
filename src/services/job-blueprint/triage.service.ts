import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { Candidate, InsightPackage } from '@/types/job-blueprint'

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

  getStats() {
    return api.get<BaseApiResponse<PipelineStats>>(`${BASE}/stats`)
  },

  getInsights(candidateId: string) {
    return api.get<BaseApiResponse<InsightPackage>>(`${BASE}/candidate/${candidateId}/insights`)
  },
}
