import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { fitService } from "@/services/job-fit/fit.service"
import type { FitDetail, FitMethod } from "@/types/job-fit"
import { retryUnlessClientError, type RetryDefault } from "@/lib/job-fit/fitDetailError"

/**
 * Full fit breakdown for one role (GET /v1/blueprint/fit/{jobId}).
 *
 * ``method`` (Decision D4) selects the scoring formula and is part of the query
 * key so switching it refetches. Defaults to "gap".
 */
export function useFitDetail(
  jobId: string | undefined,
  method: FitMethod = "gap",
  options?: Partial<UseQueryOptions<FitDetail, AxiosError>>
) {
  // NP3 (N2-a): a 404 ("no PRISM", "not available to you") never changes on
  // retry. Anything else keeps whatever the client's own default is (the app's
  // `retry: 2`), so only the 4xx case changes.
  const clientRetry = useQueryClient().getDefaultOptions().queries?.retry as RetryDefault
  return useQuery<FitDetail, AxiosError>({
    queryKey: ["job-fit", "detail", jobId, method],
    queryFn: async () => {
      const res = await fitService.getDetail(jobId as string, method)
      return res.data.data as FitDetail
    },
    enabled: Boolean(jobId),
    retry: retryUnlessClientError(clientRetry),
    ...options,
  })
}
