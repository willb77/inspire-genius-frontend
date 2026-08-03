import { useQuery } from "@tanstack/react-query"
import { getMyPrism } from "@/services/manager/development/growthService"
import type { SelfPrismResponse } from "@/types/development"

/**
 * The current user's own 8 PRISM behaviours (for the HomeV2 behavioral-map
 * popup). Fetched lazily — pass `enabled` so it only runs when the popup opens.
 */
export function useMyPrism(enabled = true) {
  return useQuery<SelfPrismResponse>({
    queryKey: ["me", "prism"],
    queryFn: async () =>
      (await getMyPrism()).data?.data ?? { dimensions: [], hasData: false },
    enabled,
    staleTime: 5 * 60_000,
  })
}
