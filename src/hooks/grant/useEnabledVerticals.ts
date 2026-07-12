import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getEnabledVerticals } from "@/services/grant/entitlements.service"
import { USE_GRANT_MOCKS } from "./mocks"

/**
 * The current user's enabled vertical packs (GET /v1/agents/me/verticals).
 *
 * While {@link USE_GRANT_MOCKS} is on, returns `["grant"]` so the vertical is
 * viewable end-to-end in mock mode. Once mocks are flipped off, reads the real
 * server entitlement; any error (e.g. endpoint not yet deployed) resolves to a
 * closed gate (`[]`) rather than throwing.
 */
export function useEnabledVerticals(
  options?: Partial<UseQueryOptions<string[], AxiosError>>
) {
  return useQuery<string[], AxiosError>({
    queryKey: ["grant", "entitlements", "me"],
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return ["grant"]
      try {
        const res = await getEnabledVerticals()
        return res.data?.enabled_verticals ?? []
      } catch {
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}
