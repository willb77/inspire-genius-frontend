import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { fitService } from "@/services/job-fit/fit.service"
import type { FitDetail } from "@/types/job-fit"

/** Full fit breakdown for one role (GET /v1/blueprint/fit/{jobId}). */
export function useFitDetail(
  jobId: string | undefined,
  options?: Partial<UseQueryOptions<FitDetail, AxiosError>>
) {
  return useQuery<FitDetail, AxiosError>({
    queryKey: ["job-fit", "detail", jobId],
    queryFn: async () => {
      const res = await fitService.getDetail(jobId as string)
      return res.data.data as FitDetail
    },
    enabled: Boolean(jobId),
    ...options,
  })
}
