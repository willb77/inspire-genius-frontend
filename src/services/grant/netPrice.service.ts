import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse, NetPriceEstimate, NetPriceRequest } from "@/types/grant"

/** POST /v1/agents/grant/net-price — estimate the net price of an institution for a student. */
export async function calculateNetPrice(body: NetPriceRequest) {
  const { data } = await agentApi.post<GrantApiResponse<NetPriceEstimate>>("/v1/agents/grant/net-price", body)
  return data
}
