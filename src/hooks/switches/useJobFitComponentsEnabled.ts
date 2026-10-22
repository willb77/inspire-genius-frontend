import { useQuery } from "@tanstack/react-query"
import { getJobFitComponentsEnabled } from "@/services/switches/jobFitComponents.service"

/** `true` only when the server says the Job Fit components are on. Loading, an
 * error and "off" all read as `false`, so today's page renders unchanged.
 *
 * `enabled` (default `true`, so every existing caller is unchanged) lets a
 * surface skip the read entirely — FIT-5b's Direction Setting only asks once
 * its own `fit_shared_display` switch is on, so the off path makes no request
 * it did not make before. Skipped reads as `false`. */
export function useJobFitComponentsEnabled(enabled = true): boolean {
  const q = useQuery({
    queryKey: ["switches", "job-fit-components"],
    queryFn: getJobFitComponentsEnabled,
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  })
  return enabled && q.data === true
}
