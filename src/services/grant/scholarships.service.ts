import { api } from "@/lib/axios"
import type { GrantApiResponse, Scholarship, ScholarshipQuery } from "@/types/grant"

/** GET /v1/scholarships — search/match scholarships for a student. */
export async function searchScholarships(params: ScholarshipQuery = {}) {
  const { data } = await api.get<GrantApiResponse<Scholarship[]>>("/v1/scholarships", {
    params,
  })
  return data
}
