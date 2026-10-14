import { useMutation } from "@tanstack/react-query"
import {
  sharePlan,
  type SharePlanInput,
  type SharePlanResult,
} from "@/services/manager/development/growthService"

/** Share a member's development plan with them: the server writes the member
 *  an in-app notice and reports whether it did (`notified` / `alreadySent`). */
export function useSharePlan(memberId: string | undefined) {
  return useMutation<SharePlanResult, Error, SharePlanInput | void>({
    mutationFn: async (input) => {
      const r = await sharePlan(memberId as string, input ?? {})
      return r.data?.data ?? {}
    },
  })
}
