import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getEnabledVerticals } from "./entitlements.service"

/**
 * The current user's enabled vertical packs (GET /v1/agents/me/verticals).
 *
 * Entitlement is ALWAYS the real server read — independent of any vertical's
 * mock flags, which only mock page *data*, not who is entitled. So a vertical
 * shows only for users with a seeded entitlement row (or via the preview
 * override in {@link useVerticalAccess}), never for everyone.
 *
 * Any error (e.g. the endpoint not yet deployed in an environment) resolves to
 * a closed gate (`[]`) rather than throwing: a vertical that fails open would
 * leak an unreleased surface to every user.
 */
export function useEnabledVerticals(
  options?: Partial<UseQueryOptions<string[], AxiosError>>
) {
  return useQuery<string[], AxiosError>({
    queryKey: ["verticals", "entitlements", "me"],
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
