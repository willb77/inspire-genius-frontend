import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { JobDNA, DimensionBenchmark } from '@/types/job-blueprint'

const BASE = '/v1/blueprint/job-dna'

export const jobDnaService = {
  create(data: Partial<JobDNA>) {
    return api.post<BaseApiResponse<JobDNA>>(BASE, data)
  },

  getById(id: string) {
    return api.get<BaseApiResponse<JobDNA>>(`${BASE}/${id}`)
  },

  update(id: string, data: Partial<JobDNA>) {
    return api.put<BaseApiResponse<JobDNA>>(`${BASE}/${id}`, data)
  },

  list() {
    return api.get<BaseApiResponse<JobDNA[]>>(BASE)
  },

  finalizeBenchmark(id: string, benchmark: { behaviors: DimensionBenchmark[]; aptitudes: DimensionBenchmark[]; coreTraits: DimensionBenchmark[] }) {
    return api.put<BaseApiResponse<JobDNA>>(`${BASE}/${id}/benchmark`, benchmark)
  },

  getBenchmark(id: string) {
    return api.get<BaseApiResponse<{ behaviors: DimensionBenchmark[]; aptitudes: DimensionBenchmark[]; coreTraits: DimensionBenchmark[] }>>(`${BASE}/${id}/benchmark`)
  },

  generateQuestions(id: string) {
    return api.post<BaseApiResponse<{ questions: string[] }>>(`${BASE}/${id}/questions`)
  },
}
