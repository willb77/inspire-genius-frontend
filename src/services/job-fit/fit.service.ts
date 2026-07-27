import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { FitMatch, FitDetail, FitMethod, FitPathway } from '@/types/job-fit'

/**
 * Person-side Job-Fit API. Routes through the `api` axios instance (API Gateway
 * → blueprint-service). All three endpoints are read-only: the user matches
 * their own PRISM profile against published Job DNAs.
 */
const BASE = '/v1/blueprint/fit'

/** Only send ?method when the user picked closeness — gap is the backend default. */
function methodParams(method?: FitMethod) {
  return method && method !== 'gap' ? { params: { method } } : undefined
}

export const fitService = {
  /** GET /v1/blueprint/fit/matches — the user's ranked matches, best-first. */
  getMatches(method?: FitMethod) {
    const cfg = methodParams(method)
    const url = `${BASE}/matches`
    // Default (gap) path stays a bare GET — identical call signature to before.
    return cfg
      ? api.get<BaseApiResponse<FitMatch[]>>(url, cfg)
      : api.get<BaseApiResponse<FitMatch[]>>(url)
  },

  /** GET /v1/blueprint/fit/{jobId} — full per-dimension fit breakdown for a role. */
  getDetail(jobId: string, method?: FitMethod) {
    const cfg = methodParams(method)
    const url = `${BASE}/${encodeURIComponent(jobId)}`
    return cfg
      ? api.get<BaseApiResponse<FitDetail>>(url, cfg)
      : api.get<BaseApiResponse<FitDetail>>(url)
  },

  /** GET /v1/blueprint/fit/pathway — adjacent role families / skill ladders (may be gated). */
  getPathway() {
    return api.get<BaseApiResponse<FitPathway>>(`${BASE}/pathway`)
  },
}
