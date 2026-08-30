import { useQuery } from "@tanstack/react-query"
import { getCareerMatches } from "@/services/manager/development/growthService"
import type { CareerMatch } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/** Ranked internal or external career matches for a member. */
export function useCareerMatches(
  memberId: string | undefined,
  kind: "internal" | "external",
) {
  return useQuery<CareerMatch[]>({
    queryKey: developmentKeys.matches(memberId ?? "", kind),
    queryFn: async () => {
      const r = await getCareerMatches(memberId as string, kind)
      return r.data?.data ?? []
    },
    enabled: Boolean(memberId),
    staleTime: 60_000,
  })
}
