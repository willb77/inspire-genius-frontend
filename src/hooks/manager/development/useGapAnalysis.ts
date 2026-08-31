import { useQuery } from "@tanstack/react-query"
import { getGapAnalysis } from "@/services/manager/development/growthService"
import type { DevelopmentGap } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/** Development gaps against a target Job Blueprint or career match. */
export function useGapAnalysis(memberId: string | undefined, targetBlueprintId?: string) {
  return useQuery<DevelopmentGap[]>({
    queryKey: developmentKeys.gaps(memberId ?? "", targetBlueprintId),
    queryFn: async () => {
      const r = await getGapAnalysis(memberId as string, targetBlueprintId)
      return r.data?.data ?? []
    },
    enabled: Boolean(memberId),
    staleTime: 60_000,
  })
}
