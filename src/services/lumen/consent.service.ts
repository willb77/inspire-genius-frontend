import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type { ConsentUpdate, LumenConsent } from "@/types/lumen"

const PREFIX = "/v1/agents/lumen"

/**
 * GET /v1/agents/lumen/consent — the caller's proactive-guidance consent.
 *
 * A user who has never saved a choice gets the documented defaults with
 * `is_default: true`.
 */
export async function getConsent() {
  const { data } = await getApi().get<VerticalApiResponse<LumenConsent>>(
    `${PREFIX}/consent`
  )
  return data
}

/**
 * PATCH /v1/agents/lumen/consent — update it. Partial: omitted fields keep
 * their current value. Self-only; consent is never set for someone else.
 */
export async function updateConsent(updates: ConsentUpdate) {
  const { data } = await getApi().patch<VerticalApiResponse<LumenConsent>>(
    `${PREFIX}/consent`,
    updates
  )
  return data
}
