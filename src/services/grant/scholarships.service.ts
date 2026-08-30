import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse, Scholarship, ScholarshipQuery } from "@/types/grant"

/** GET /v1/agents/grant/scholarships — search/match scholarships for a student. */
export async function searchScholarships(params: ScholarshipQuery = {}) {
  const { data } = await agentApi.get<GrantApiResponse<Scholarship[]>>("/v1/agents/grant/scholarships", {
    params,
  })
  return data
}
