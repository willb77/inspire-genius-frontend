import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { TargetDraft } from '@/types/targets'

/**
 * Shared target service (Decision D7). Routes through the `api` axios instance
 * (API Gateway → blueprint-service, `ANY /v1/targets/{proxy+}`) — NOT the Agent
 * Engine. The extract call is JWT-protected by the global AuthMiddleware but is
 * NOT behind `blueprint_matching_enabled`: it takes a job description (text) only
 * and returns a governed DRAFT, so it is available to any authenticated user.
 *
 * Only `extract` is wired today — the Job-Fit "Fit a job description" tool needs
 * the draft, nothing more. `score` / `adverse-impact` join here when a consumer
 * needs them.
 */
const BASE = '/v1/targets'

export const targetsService = {
  /**
   * POST /v1/targets/extract — draft a target over the 22 dimensions from a job
   * description. Returns a DRAFT (never authoritative). The service answers 400
   * when `jdText` is empty, so callers should guard before sending.
   */
  extract(jdText: string) {
    return api.post<BaseApiResponse<TargetDraft>>(`${BASE}/extract`, { jdText })
  },
}
