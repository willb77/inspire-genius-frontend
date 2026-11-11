import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { fitService } from "@/services/job-fit/fit.service"
import type { FitPathway } from "@/types/job-fit"

/**
 * Career pathway suggestions (GET /v1/blueprint/fit/pathway).
 *
 * May be feature-gated or empty; the consuming page renders an empty state
 * rather than treating an empty payload as an error. `retry: false` keeps a
 * gated 404/403 from spinning.
 */
export function useFitPathway(
  options?: Partial<UseQueryOptions<FitPathway, AxiosError>>,
  /** JF-9 — the job the pathway starts from (`?from=`); absent = today's read. */
  from?: string | null,
) {
  return useQuery<FitPathway, AxiosError>({
    queryKey: from ? ["job-fit", "pathway", from] : ["job-fit", "pathway"],
    queryFn: async () => {
      const res = from ? await fitService.getPathway(from) : await fitService.getPathway()
      return res.data.data ?? {}
    },
    retry: false,
    ...options,
  })
}
