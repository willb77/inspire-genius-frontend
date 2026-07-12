import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse, RepaymentEstimate, RepaymentRequest } from "@/types/grant"

/** POST /v1/agents/grant/calculate-repayment — project a loan repayment schedule. */
export async function calculateRepayment(body: RepaymentRequest) {
  const { data } = await agentApi.post<GrantApiResponse<RepaymentEstimate>>(
    "/v1/agents/grant/calculate-repayment",
    body
  )
  return data
}
