import { api } from "@/lib/axios"
import type { GrantApiResponse, SalaryLookup } from "@/types/grant"

/** GET /v1/salary-lookup — median/entry salary + growth for an occupation. */
export async function lookupSalary(occupation: string) {
  const { data } = await api.get<GrantApiResponse<SalaryLookup>>("/v1/salary-lookup", {
    params: { occupation },
  })
  return data
}
