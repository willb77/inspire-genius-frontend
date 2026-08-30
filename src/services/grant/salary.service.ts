import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse, SalaryLookup } from "@/types/grant"

/** GET /v1/agents/grant/salary-lookup — median/entry salary + growth for an occupation. */
export async function lookupSalary(occupation: string) {
  const { data } = await agentApi.get<GrantApiResponse<SalaryLookup>>("/v1/agents/grant/salary-lookup", {
    params: { occupation },
  })
  return data
}
