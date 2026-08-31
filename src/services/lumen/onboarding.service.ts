import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  OnboardingStatus,
  PrismRequestBody,
  PrismRequestResult,
} from "@/types/lumen"

const PREFIX = "/v1/agents/lumen"

/**
 * GET /v1/agents/lumen/onboarding/status — what the user should do next.
 *
 * Derived server-side from their PRISM requests and composed portrait, so it
 * can't drift from reality the way a stored progress flag would. Says nothing
 * about entitlement — that's `useVerticalAccess`.
 */
export async function getOnboardingStatus() {
  const { data } = await getApi().get<VerticalApiResponse<OnboardingStatus>>(
    `${PREFIX}/onboarding/status`
  )
  return data
}

/**
 * POST /v1/agents/lumen/onboarding/prism-request — request the user's survey.
 *
 * Proxied through Lumen rather than calling `/v1/prism/*` directly, so the whole
 * Lumen UI talks to one prefix. The backend reuses the existing PRISM route,
 * including its 24-hour idempotency window — asking twice returns the same link
 * rather than burning survey quota.
 */
export async function requestPrismSurvey(body: PrismRequestBody) {
  const { data } = await getApi().post<VerticalApiResponse<PrismRequestResult>>(
    `${PREFIX}/onboarding/prism-request`,
    body
  )
  return data
}
