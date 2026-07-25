import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { FitMatch, FitDetail, FitPathway } from '@/types/job-fit'

/**
 * Person-side Job-Fit API. Routes through the `api` axios instance (API Gateway
 * → blueprint-service). All three endpoints are read-only: the user matches
 * their own PRISM profile against published Job DNAs.
 */
const BASE = '/v1/blueprint/fit'

export const fitService = {
  /** GET /v1/blueprint/fit/matches — the user's ranked matches, best-first. */
  getMatches() {
    return api.get<BaseApiResponse<FitMatch[]>>(`${BASE}/matches`)
  },

  /** GET /v1/blueprint/fit/{jobId} — full per-dimension fit breakdown for a role. */
  getDetail(jobId: string) {
    return api.get<BaseApiResponse<FitDetail>>(`${BASE}/${encodeURIComponent(jobId)}`)
  },

  /** GET /v1/blueprint/fit/pathway — adjacent role families / skill ladders (may be gated). */
  getPathway() {
    return api.get<BaseApiResponse<FitPathway>>(`${BASE}/pathway`)
  },
}
