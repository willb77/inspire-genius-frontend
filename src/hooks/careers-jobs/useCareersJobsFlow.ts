import { useQuery } from "@tanstack/react-query"
import { getCareersJobsFlowEnabled } from "@/services/careers-jobs/careersJobs.service"

export const careersJobsKeys = {
  flow: ["careers-jobs", "flow"] as const,
}

/**
 * `true` only when the server says the Careers and Jobs phase strip is on for
 * this person. Loading, an error, a 403 or "off" all read as `false`, so both
 * shells render exactly as today — no spinner, no extra wait. Same options as
 * `useSavedJobsEnabled()` (CSA B3).
 */
export function useCareersJobsFlow(): boolean {
  const q = useQuery({
    queryKey: careersJobsKeys.flow,
    queryFn: getCareersJobsFlowEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
