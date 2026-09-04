import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createCoachingNote,
  getDevelopmentGoals,
  getGoalReviews,
  ratifyGoal,
  type CoachingNote,
  type CreateCoachingNoteInput,
  type DevelopmentGoalsResponse,
  type RatifyResult,
} from "@/services/manager/development/growthService"
import type { GoalReviewList } from "@/types/development"
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
 * A coach's review of a goal: ratified or not, with a comment. Never
 * overwrites the member's own ratification; writes a review the member reads
 * back (Goals offering, Phase 4, D7). Invalidates goals, reviews + dossier.
 */
export function useRatifyGoal(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<RatifyResult, Error, { goalId: string; comment?: string; ratified?: boolean }>({
    mutationFn: async ({ goalId, comment, ratified }) => {
      const r = await ratifyGoal(goalId, comment, ratified ?? true)
      const data = r.data?.data
      if (!data) throw new Error("Review failed")
      return data
    },
    onSuccess: () => {
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.goals(memberId) })
      qc.invalidateQueries({ queryKey: developmentKeys.goalReviews(memberId) })
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}

/**
 * Every coach review of the member's shared goals. Behind the goals grant on
 * the server (403 without it); the tab only asks when goals are shared, so a
 * 403 here is a bug, not a state — let it surface as an error.
 */
export function useGoalReviews(memberId: string | undefined, enabled = true) {
  return useQuery<GoalReviewList>({
    queryKey: developmentKeys.goalReviews(memberId ?? ""),
    queryFn: async () => {
      const r = await getGoalReviews(memberId as string)
      return r.data?.data ?? { memberId: memberId ?? "", reviews: [] }
    },
    enabled: Boolean(memberId) && enabled,
    staleTime: 60_000,
  })
}

/** One coaching note about this member — optionally about one of their goals. */
export function useCreateCoachingNote(memberId: string | undefined) {
  return useMutation<CoachingNote, Error, CreateCoachingNoteInput>({
    mutationFn: async (input) => {
      const r = await createCoachingNote(memberId as string, input)
      const data = r.data?.data
      if (!data) throw new Error("Note not saved")
      return data
    },
  })
}
