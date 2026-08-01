import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { useMemo } from "react"
import {
  deleteGoal,
  getGoalSession,
  patchGoal,
} from "@/services/summit/goals.service"
import {
  SUMMIT_CATEGORY_KEYS,
  type SummitCategory,
  type SummitCategoryKey,
  type SummitGoal,
  type SummitSession,
} from "@/types/summit"

export const summitKeys = {
  all: ["summit"] as const,
  session: ["summit", "session"] as const,
}

/**
 * The caller's live goal-setting session.
 *
 * One read backs the whole Summit surface — categories, their statuses, and
 * every goal. Short `staleTime` because the Meridian panel on the right can
 * change this state mid-visit: a person talks to Summit, goals get synthesised,
 * and the page beside the conversation should not still be showing the state
 * from before it.
 */
export function useGoalSession(
  options?: Partial<UseQueryOptions<SummitSession, AxiosError>>
) {
  return useQuery<SummitSession, AxiosError>({
    queryKey: summitKeys.session,
    queryFn: getGoalSession,
    staleTime: 30 * 1000,
    ...options,
  })
}

/** One discovery category, flattened for rendering. */
export type SummitCategoryView = SummitCategory & {
  key: SummitCategoryKey
  /** 1-based position, for the "Category 3" labels. */
  n: number
  /** How many goals came out of this category. */
  goalCount: number
}

/**
 * The five categories in the backend's fixed order, with their goal counts.
 *
 * Order comes from `SUMMIT_CATEGORY_KEYS` rather than `Object.keys(...)`:
 * JSON object key order is not something to build a numbered stepper on, and
 * "Category 3" jumping around between reads would be worse than useless.
 *
 * A category the backend has not sent is skipped rather than faked — if the
 * vocabulary changes server-side, the step disappears instead of rendering an
 * empty card that looks like the person failed to do something.
 */
export function useSummitCategories(session: SummitSession | undefined) {
  return useMemo<SummitCategoryView[]>(() => {
    if (!session?.categories) return []
    const counts = new Map<string, number>()
    for (const goal of session.goals ?? []) {
      if (!goal.category) continue
      counts.set(goal.category, (counts.get(goal.category) ?? 0) + 1)
    }
    const out: SummitCategoryView[] = []
    SUMMIT_CATEGORY_KEYS.forEach((key) => {
      const category = session.categories[key]
      if (!category) return
      out.push({
        ...category,
        key,
        n: out.length + 1,
        goalCount: counts.get(key) ?? 0,
      })
    })
    return out
  }, [session])
}

/**
 * Confirm or edit a goal.
 *
 * Invalidates the session rather than patching the cache: goals and category
 * state are derived from one another (a confirmed goal changes what the
 * dashboard says about its category), and re-reading is the only way to be sure
 * the two agree.
 */
export function usePatchGoal() {
  const qc = useQueryClient()
  return useMutation<
    SummitGoal,
    AxiosError,
    { goalId: string; body: Parameters<typeof patchGoal>[1] }
  >({
    mutationFn: ({ goalId, body }) => patchGoal(goalId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: summitKeys.session })
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation<void, AxiosError, string>({
    mutationFn: deleteGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: summitKeys.session })
    },
  })
}
