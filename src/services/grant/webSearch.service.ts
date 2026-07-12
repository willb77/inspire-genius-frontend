import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse, WebSearchRequest, WebSearchResult } from "@/types/grant"

/** POST /v1/web-search — grounded web search for aid research. */
export async function webSearch(body: WebSearchRequest) {
  const { data } = await agentApi.post<GrantApiResponse<WebSearchResult[]>>("/v1/web-search", body)
  return data
}
