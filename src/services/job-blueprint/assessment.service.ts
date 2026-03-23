import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { BMLAssessment, BMLResponse, DimensionScore } from '@/types/job-blueprint'

const BASE = '/v1/blueprint/assessment'

export type AssessmentStats = {
  total: number
  completed: number
  inProgress: number
  avgCompletionTime: number
}

export const assessmentService = {
  create(data: { candidateId: string; jobId: string }) {
    return api.post<BaseApiResponse<BMLAssessment>>(BASE, data)
  },

  getById(id: string) {
    return api.get<BaseApiResponse<BMLAssessment>>(`${BASE}/${id}`)
  },

  submit(id: string, responses: BMLResponse[]) {
    return api.post<BaseApiResponse<BMLAssessment>>(`${BASE}/${id}/submit`, { responses })
  },

  getResults(id: string) {
    return api.get<BaseApiResponse<{ scores: DimensionScore[]; confidence: number }>>(`${BASE}/${id}/results`)
  },

  getStats() {
    return api.get<BaseApiResponse<AssessmentStats>>(`${BASE}/stats`)
  },
}
