import { useQuery } from "@tanstack/react-query"
import { getMemberFitMatches } from "@/services/manager/development/growthService"
import type { MemberFitMatches } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/**
 * 3.3a — a member's matches from the fit engine, always with a `state`.
 *
 * `enabled` is the caller's FIT_ENGINE_MATCHES_ENABLED: with the flag off this
 * never fires, so a tier whose backend has no `/fit-matches` route is never
 * asked for it. A response without a `state` is treated as `unavailable`
 * rather than as an empty list, which would read as "no matches".
 */
export function useMemberFitMatches(memberId: string | undefined, enabled: boolean) {
  return useQuery<MemberFitMatches>({
    queryKey: developmentKeys.fitMatches(memberId ?? ""),
    queryFn: async () => {
      const r = await getMemberFitMatches(memberId as string)
      const data = r.data?.data
      if (!data || !data.state) {
        return { state: "unavailable", matches: [], asOf: null, ageDays: null }
      }
      return { ...data, matches: data.matches ?? [] }
    },
    enabled: enabled && Boolean(memberId),
    staleTime: 60_000,
  })
}
