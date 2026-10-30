import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  postGoalSession,
  type GoalSessionAction,
  type GoalSessionChannel,
  type GoalSessionResult,
} from "@/services/manager/development/growthService"
import { developmentKeys } from "./queryKeys"

/**
 * Record a Summit discovery-session invite for a member.
 * Invalidates goals + dossier so the coverage strip reflects the new state.
 *
 * TDS-GI-1: the growth service now writes the member an in-app notice for a
 * Goals invite (at most once per inviter per 24h) and says whether it did.
 * `goalSessionToast` reports exactly that. A server that predates the change
 * returns no `notified` field, so the old "not notified" wording stays.
 */
export const GOAL_INVITE_RECORDED =
  "Invite recorded. The member isn't notified automatically yet, so let them know directly."
export const GOAL_INVITE_SENT = "Invite sent to the member's notifications."
export const GOAL_INVITE_ALREADY_SENT =
  "Already invited today, so no second notice was sent."
export const GOAL_INVITE_NO_ACCOUNT =
  "Invite recorded, but this member has no account to notify. Let them know directly."
export const GOAL_INVITE_NOT_SENT =
  "Invite recorded, but the notice couldn't be sent. Let them know directly."
export const PRISM_SETUP_RECORDED =
  "PRISM set-up recorded. The member isn't notified automatically, so let them know directly."

/** A plain action, or an action with the channel it came from. */
export type GoalSessionRequest =
  | GoalSessionAction
  | { action: GoalSessionAction; channel?: GoalSessionChannel }

export function goalSessionToast(
  result: GoalSessionResult | undefined,
  channel?: GoalSessionChannel,
): void {
  if (channel === "prism_setup") {
    toast.success(PRISM_SETUP_RECORDED)
    return
  }
  if (!result || typeof result.notified !== "boolean") {
    toast.success(GOAL_INVITE_RECORDED)
    return
  }
  if (result.notified) {
    toast.success(GOAL_INVITE_SENT)
    return
  }
  if (result.alreadySent) {
    toast.success(GOAL_INVITE_ALREADY_SENT)
    return
  }
  toast.warning(result.noAccount ? GOAL_INVITE_NO_ACCOUNT : GOAL_INVITE_NOT_SENT)
}

export function useGoalSession(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<GoalSessionResult, Error, GoalSessionRequest>({
    // Opted into the global error net (`lib/mutationErrorToast.ts`): this hook
    // has no `onError`, and its caller fires it without awaiting, so a failure
    // has no other voice. `applyStaged` clears the proposed action
    // card unconditionally after `.mutate()`, so a failure removed the card
    // and said nothing.
    meta: { surfaceError: true },

    mutationFn: async (req) => {
      const { action, channel } = typeof req === "string" ? { action: req, channel: undefined } : req
      const r = await postGoalSession(memberId as string, action, channel)
      return r.data?.data ?? {}
    },
    onSuccess: (result, req) => {
      goalSessionToast(result, typeof req === "string" ? undefined : req.channel)
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.goals(memberId) })
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
