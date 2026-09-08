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
 * Only `extract` is wired here. "Fit a job description" scores its draft through
 * `fitService.scoreTarget` (`POST /v1/blueprint/fit/target`), NOT through
 * `/v1/targets/score`: that route is vector-only by design (Decision D6) and the
 * user's own vector never passes through the browser, so the self-scoped fit
 * route loads it server-side. `score` / `adverse-impact` join here only for a
 * consumer that already holds a vector.
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
