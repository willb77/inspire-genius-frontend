import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { fitService } from "@/services/job-fit/fit.service"
import type { FitMatch } from "@/types/job-fit"

/** The user's ranked role matches (GET /v1/blueprint/fit/matches). */
export function useFitMatches(
  options?: Partial<UseQueryOptions<FitMatch[], AxiosError>>
) {
  return useQuery<FitMatch[], AxiosError>({
    queryKey: ["job-fit", "matches"],
    queryFn: async () => {
      const res = await fitService.getMatches()
      return res.data.data ?? []
    },
    ...options,
  })
}
