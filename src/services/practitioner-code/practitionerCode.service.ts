import { agentApi } from "@/lib/agentApi"
import type { RedeemResult } from "@/types/practitioner-registry"

/**
 * A signed-in client enters their practitioner's code (Practitioner Programme PC-1c).
 *
 * Calls `agentApi` — the route lives on the agent-engine under
 * `/v1/agents/{proxy+}`. An unknown code and a deactivated practitioner's code
 * come back as the same 404; the response on success is the practitioner's
 * name and nothing else.
 */
export async function redeemPractitionerCode(code: string): Promise<RedeemResult> {
  const { data } = await agentApi.post<{ status: boolean; data: RedeemResult }>(
    "/v1/agents/practitioner-registry/redeem",
    { code },
  )
  return data.data
}
