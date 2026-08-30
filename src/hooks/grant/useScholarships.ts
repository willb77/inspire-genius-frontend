import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { searchScholarships } from "@/services/grant/scholarships.service"
import type { Scholarship, ScholarshipQuery } from "@/types/grant"
import { MOCK_SCHOLARSHIPS, USE_GRANT_MOCKS } from "./mocks"

/** Scholarship search/match (GET /v1/scholarships), mock-backed for UI-0. */
export function useScholarships(
  params: ScholarshipQuery = {},
  options?: Partial<UseQueryOptions<Scholarship[], AxiosError>>
) {
  return useQuery<Scholarship[], AxiosError>({
    queryKey: ["grant", "scholarships", params],
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_SCHOLARSHIPS
      const res = await searchScholarships(params)
      return res.data ?? []
    },
    ...options,
  })
}
