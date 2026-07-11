import { useMutation, type UseMutationOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { webSearch } from "@/services/grant/webSearch.service"
import type { WebSearchRequest, WebSearchResult } from "@/types/grant"
import { MOCK_WEB_SEARCH, USE_GRANT_MOCKS } from "./mocks"

/** Grounded web search for aid research (POST /v1/web-search), mock-backed for UI-0. */
export function useWebSearch(
  options?: UseMutationOptions<WebSearchResult[], AxiosError, WebSearchRequest>
) {
  return useMutation<WebSearchResult[], AxiosError, WebSearchRequest>({
    mutationKey: ["grant", "web-search"],
    mutationFn: async (body) => {
      if (USE_GRANT_MOCKS) return MOCK_WEB_SEARCH
      const res = await webSearch(body)
      return res.data ?? []
    },
    ...options,
  })
}
