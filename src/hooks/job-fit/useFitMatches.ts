import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { fitService } from "@/services/job-fit/fit.service"
import type { FitMatch, FitMethod } from "@/types/job-fit"

/**
 * The user's ranked role matches (GET /v1/blueprint/fit/matches).
 *
 * ``method`` (Decision D4) selects the scoring formula and is part of the query
 * key so switching it refetches. Defaults to "gap" (the backend default).
 */
export function useFitMatches(
  method: FitMethod = "gap",
  options?: Partial<UseQueryOptions<FitMatch[], AxiosError>>
) {
  return useQuery<FitMatch[], AxiosError>({
    queryKey: ["job-fit", "matches", method],
    queryFn: async () => {
      const res = await fitService.getMatches(method)
      return res.data.data ?? []
    },
    ...options,
  })
}
