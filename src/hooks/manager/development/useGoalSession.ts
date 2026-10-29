import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { postGoalSession, type GoalSessionAction } from "@/services/manager/development/growthService"
import { developmentKeys } from "./queryKeys"

/**
 * Record a Summit discovery-session invite for a member.
 * Invalidates goals + dossier so the coverage strip reflects the new state.
 *
 * The growth service records the invite and sends nothing yet: there is no
 * Summit invite call and nothing consumes `GoalSessionInvited`. So success says
 * exactly that, rather than nothing (which read as a dead button) or "sent"
 * (which would be false).
 */
export const GOAL_INVITE_RECORDED =
  "Invite recorded. The member isn't notified automatically yet, so let them know directly."

export function useGoalSession(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<{ sessionId?: string; status?: string }, Error, GoalSessionAction>({
    // Opted into the global error net (`lib/mutationErrorToast.ts`): this hook
    // has no `onError`, and its caller fires it without awaiting, so a failure
    // has no other voice. `applyStaged` clears the proposed action
    // card unconditionally after `.mutate()`, so a failure removed the card
    // and said nothing.
    meta: { surfaceError: true },

    mutationFn: async (action) => {
      const r = await postGoalSession(memberId as string, action)
      return r.data?.data ?? {}
    },
    onSuccess: () => {
      toast.success(GOAL_INVITE_RECORDED)
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.goals(memberId) })
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
