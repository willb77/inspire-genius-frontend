import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getMyGoalReviews } from "@/services/manager/development/growthService"
import type { GoalReviewList } from "@/types/development"
import type { AxiosError } from "axios"
import {
  createGoal,
  getMyGoals,
  publishGoal,
  setGoalVisibility,
  unpublishGoal,
} from "@/services/summit/goals.service"
import { summitKeys } from "@/hooks/summit/useGoalSession"
import type { GoalVisibility, MyGoalsResponse, SharedGoal, SummitGoalCreate } from "@/types/summit"
import type { SummitGoal } from "@/types/summit"

/**
 * The shared record (Store B) — the person's published goals.
 *
 * Every mutation here touches BOTH stores' caches: publish reads the session
 * and writes the record, so the session query (which is what the drafts list
 * reads) and the `mine` query (the published list) are invalidated together.
 * Invalidating one and not the other is how a goal ends up shown as both a
 * draft and published for a render.
 */
export const myGoalsKeys = {
  mine: ["summit", "mine"] as const,
}

export function useMyGoals() {
  return useQuery<MyGoalsResponse, AxiosError>({
    queryKey: myGoalsKeys.mine,
    queryFn: getMyGoals,
    staleTime: 30 * 1000,
  })
}

function useInvalidateBoth() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: summitKeys.session }),
      qc.invalidateQueries({ queryKey: myGoalsKeys.mine }),
    ])
}

/** Quick-add: a session goal from a title + category. Publish is a second step. */
export function useCreateGoal() {
  const invalidate = useInvalidateBoth()
  return useMutation<SummitGoal, AxiosError, SummitGoalCreate>({
    mutationFn: createGoal,
    onSuccess: () => invalidate(),
  })
}

export function usePublishGoal() {
  const invalidate = useInvalidateBoth()
  return useMutation<SharedGoal, AxiosError, string>({
    mutationFn: publishGoal,
    onSuccess: () => invalidate(),
  })
}

export function useUnpublishGoal() {
  const invalidate = useInvalidateBoth()
  return useMutation<{ publishedFrom: string; removed: boolean }, AxiosError, string>({
    mutationFn: unpublishGoal,
    onSuccess: () => invalidate(),
  })
}

export function useSetGoalVisibility() {
  const qc = useQueryClient()
  return useMutation<SharedGoal, AxiosError, { goalId: string; visibility: GoalVisibility }>({
    mutationFn: ({ goalId, visibility }) => setGoalVisibility(goalId, visibility),
    onSuccess: () => qc.invalidateQueries({ queryKey: myGoalsKeys.mine }),
  })
}

/**
 * The reviews coaches wrote on the member's own goals (Goals offering,
 * Phase 4, D7). Read from growth's self-scoped route; the member id is the
 * token's sub, nothing is passed.
 */
export function useMyGoalReviews() {
  return useQuery<GoalReviewList>({
    queryKey: [...myGoalsKeys.mine, "reviews"] as const,
    queryFn: async () => {
      const r = await getMyGoalReviews()
      return r.data?.data ?? { memberId: "", reviews: [] }
    },
    staleTime: 60_000,
  })
}
