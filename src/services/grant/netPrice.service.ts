import { api } from "@/lib/axios"
import type { GrantApiResponse, NetPriceEstimate, NetPriceRequest } from "@/types/grant"

/** POST /v1/net-price — estimate the net price of an institution for a student. */
export async function calculateNetPrice(body: NetPriceRequest) {
  const { data } = await api.post<GrantApiResponse<NetPriceEstimate>>("/v1/net-price", body)
  return data
}
