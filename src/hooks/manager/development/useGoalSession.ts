import { useMutation, useQueryClient } from "@tanstack/react-query"
import { postGoalSession, type GoalSessionAction } from "@/services/manager/development/growthService"
import { developmentKeys } from "./queryKeys"

/**
 * Invite a member to a Summit discovery session or resume an in-progress one.
 * Invalidates goals + dossier so the coverage strip reflects the new state.
 */
export function useGoalSession(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<{ sessionId?: string; status?: string }, Error, GoalSessionAction>({
    mutationFn: async (action) => {
      const r = await postGoalSession(memberId as string, action)
      return r.data?.data ?? {}
    },
    onSuccess: () => {
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.goals(memberId) })
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
