import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getRiskRegister } from "@/services/knowledge-continuity/continuity.service"
import type { RiskEntry } from "@/types/knowledge-continuity"

/** Full at-risk roster (GET /v1/trainer/continuity/risk-register). */
export function useRiskRegister(
  orgId?: string,
  options?: Partial<UseQueryOptions<RiskEntry[], AxiosError>>
) {
  return useQuery<RiskEntry[], AxiosError>({
    queryKey: ["knowledge-continuity", "risk-register", orgId ?? "all"],
    queryFn: async () => {
      const res = await getRiskRegister(orgId)
      return res.data ?? []
    },
    ...options,
  })
}
