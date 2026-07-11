import { useMutation, type UseMutationOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { calculateRepayment } from "@/services/grant/loans.service"
import type { RepaymentEstimate, RepaymentRequest } from "@/types/grant"
import { MOCK_REPAYMENT, USE_GRANT_MOCKS } from "./mocks"

/** Loan repayment projection (POST /v1/calculate-repayment), mock-backed for UI-0. */
export function useRepayment(
  options?: UseMutationOptions<RepaymentEstimate, AxiosError, RepaymentRequest>
) {
  return useMutation<RepaymentEstimate, AxiosError, RepaymentRequest>({
    mutationKey: ["grant", "calculate-repayment"],
    mutationFn: async (body) => {
      if (USE_GRANT_MOCKS) return { ...MOCK_REPAYMENT, plan: body.plan }
      const res = await calculateRepayment(body)
      return res.data as RepaymentEstimate
    },
    ...options,
  })
}
