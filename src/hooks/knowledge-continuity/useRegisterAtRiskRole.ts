import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { registerAtRiskRole } from "@/services/knowledge-continuity/continuity.service"
import type { RegisterRiskRequest, RiskEntry } from "@/types/knowledge-continuity"

/**
 * Register an at-risk role/expert (POST /v1/trainer/continuity/risk-register).
 * On success, invalidates the risk register (and Program-Health analytics,
 * which summarizes it) and toasts the computed KRI + capture priority.
 */
export function useRegisterAtRiskRole() {
  const qc = useQueryClient()
  return useMutation<RiskEntry, AxiosError, RegisterRiskRequest>({
    mutationFn: async (body) => {
      const res = await registerAtRiskRole(body)
      if (!res.data) throw new Error("No risk-register response from the server")
      return res.data
    },
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ["knowledge-continuity", "risk-register"] })
      qc.invalidateQueries({ queryKey: ["knowledge-continuity", "analytics"] })
      toast.success(
        `${entry.role_title} registered — KRI ${entry.kri.toFixed(2)}, priority ${entry.capture_priority}`
      )
    },
    onError: () => {
      toast.error("Couldn't register this role. Please try again.")
    },
  })
}
