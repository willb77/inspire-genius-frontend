import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getDevelopmentGoals,
  ratifyGoal,
  type DevelopmentGoalsResponse,
} from "@/services/manager/development/growthService"
import type { SummitGoal } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/** Read Summit-formalized goals + five-category coverage for a member. */
export function useDevelopmentGoals(memberId: string | undefined) {
  return useQuery<DevelopmentGoalsResponse>({
    queryKey: developmentKeys.goals(memberId ?? ""),
    queryFn: async () => {
      const r = await getDevelopmentGoals(memberId as string)
      return r.data?.data ?? { goals: [], coverage: [] }
    },
    enabled: Boolean(memberId),
    staleTime: 60_000,
  })
}

/**
 * Manager co-ratify / comment on a goal. Never overwrites the member's own
 * ratification. Invalidates goals + dossier on success.
 */
export function useRatifyGoal(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<SummitGoal, Error, { goalId: string; comment?: string }>({
    mutationFn: async ({ goalId, comment }) => {
      const r = await ratifyGoal(goalId, comment)
      const data = r.data?.data
      if (!data) throw new Error("Ratify failed")
      return data
    },
    onSuccess: () => {
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.goals(memberId) })
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
