import { useQuery } from "@tanstack/react-query"
import { getManagerFitViews } from "@/services/job-fit/managerViews.service"
import type { ManagerFitView } from "@/types/job-fit"

export const MANAGER_FIT_VIEWS_KEY = ["job-fit", "manager-views"] as const

function httpStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const response = (err as { response?: { status?: unknown } }).response
  return typeof response?.status === "number" ? response.status : undefined
}

/**
 * TS-4b — "your manager viewed your fit for <role>": the person's own notices.
 *
 * An empty list is the normal answer (nobody has scored them, which is everyone
 * until the server switch is turned on for their organisation). A backend that
 * does not have the route yet answers 404, which is the same fact, so it reads
 * as an empty list. Any OTHER failure is thrown: the page then says it could
 * not check, rather than showing nothing and implying nobody looked.
 */
export function useManagerFitViews() {
  return useQuery<ManagerFitView[]>({
    queryKey: MANAGER_FIT_VIEWS_KEY,
    queryFn: async () => {
      try {
        const rows = (await getManagerFitViews()).data?.data
        return Array.isArray(rows) ? rows : []
      } catch (err) {
        if (httpStatus(err) === 404) return []
        throw err
      }
    },
    staleTime: 60_000,
    retry: false,
  })
}
