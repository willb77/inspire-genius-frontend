import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getAnalytics } from "@/services/knowledge-continuity/continuity.service"
import type { ContinuityAnalytics } from "@/types/knowledge-continuity"

/** Program-Health analytics summary (GET /v1/trainer/continuity/analytics). */
export function useContinuityAnalytics(
  orgId?: string,
  options?: Partial<UseQueryOptions<ContinuityAnalytics | undefined, AxiosError>>
) {
  return useQuery<ContinuityAnalytics | undefined, AxiosError>({
    queryKey: ["knowledge-continuity", "analytics", orgId ?? "all"],
    queryFn: async () => {
      const res = await getAnalytics(orgId)
      return res.data
    },
    ...options,
  })
}
