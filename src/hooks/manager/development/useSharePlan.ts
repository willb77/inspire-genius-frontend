import { useMutation } from "@tanstack/react-query"
import { sharePlan, type SharePlanInput } from "@/services/manager/development/growthService"

/** Share a member's development plan with them (member-facing export). */
export function useSharePlan(memberId: string | undefined) {
  return useMutation<{ shared: boolean; sharedAt?: string }, Error, SharePlanInput | void>({
    mutationFn: async (input) => {
      const r = await sharePlan(memberId as string, input ?? {})
      return r.data?.data ?? { shared: false }
    },
  })
}
