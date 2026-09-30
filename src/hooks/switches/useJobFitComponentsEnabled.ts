import { useQuery } from "@tanstack/react-query"
import { getJobFitComponentsEnabled } from "@/services/switches/jobFitComponents.service"

/** `true` only when the server says the Job Fit components are on. Loading, an
 * error and "off" all read as `false`, so today's page renders unchanged. */
export function useJobFitComponentsEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "job-fit-components"],
    queryFn: getJobFitComponentsEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
