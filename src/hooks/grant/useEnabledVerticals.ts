import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getEnabledVerticals } from "@/services/grant/entitlements.service"

/**
 * The current user's enabled vertical packs (GET /v1/agents/me/verticals).
 *
 * Entitlement is ALWAYS the real server read — independent of USE_GRANT_MOCKS,
 * which only mocks page *data*, not who is entitled. So the vertical shows only
 * for users with a seeded entitlement row (or via the dev-access shortcut in
 * {@link useVerticalAccess}), never for everyone. Any error (e.g. the endpoint
 * not yet deployed in an environment) resolves to a closed gate (`[]`) rather
 * than throwing.
 */
export function useEnabledVerticals(
  options?: Partial<UseQueryOptions<string[], AxiosError>>
) {
  return useQuery<string[], AxiosError>({
    queryKey: ["grant", "entitlements", "me"],
    queryFn: async () => {
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
