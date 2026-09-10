import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type {
  FitMatch,
  FitDetail,
  FitMethod,
  FitPathway,
  FitTargetRequest,
  FitSnapshot,
  FitSnapshotSaveBody,
  FitSnapshotSummary,
} from '@/types/job-fit'

/**
 * Person-side Job-Fit API. Routes through the `api` axios instance (API Gateway
 * → blueprint-service). The three GETs are read-only: the user matches their
 * own PRISM profile against published Job DNAs. `scoreTarget` POSTs a target
 * the user pasted as a job description and gets the same breakdown back; the
 * user's own vector is loaded server-side and never passes through here.
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

  /**
   * POST /v1/blueprint/fit/target — the user's own PRISM scored against a
   * caller-supplied target (the "Fit a job description" draft). 404 when the
   * user has no PRISM assessment on file; callers render that honestly.
   */
  scoreTarget(body: FitTargetRequest) {
    return api.post<BaseApiResponse<FitDetail>>(`${BASE}/target`, body)
  },

  // ── Fit history (JS-3). Every fit read above leaves a row server-side; these read it back. ──

  /** GET /v1/blueprint/fit/history — the user's own history, newest first, summaries only. */
  getHistory() {
    return api.get<BaseApiResponse<FitSnapshotSummary[]>>(`${BASE}/history`)
  },

  /** GET /v1/blueprint/fit/history/snapshot/{id} — one of the user's own rows with its payload. */
  getSnapshot(snapshotId: string) {
    return api.get<BaseApiResponse<FitSnapshot>>(`${BASE}/history/snapshot/${encodeURIComponent(snapshotId)}`)
  },

  /** POST /v1/blueprint/fit/history — "Save to your fit reports". */
  saveSnapshot(body: FitSnapshotSaveBody) {
    return api.post<BaseApiResponse<FitSnapshotSummary>>(`${BASE}/history`, body)
  },
}
