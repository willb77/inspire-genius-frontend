import { useQuery } from "@tanstack/react-query"
import { getFitComponents, getGoalsWiring } from "@/services/job-fit/components.service"
import type { ComponentsJobIn } from "@/types/job-fit/components"

/**
 * The components for these roles — only fetched when the server switch is on
 * and there is something to ask about. `enabled=false` leaves the query idle,
 * so a page with the switch off makes no extra request.
 */
export function useFitComponents(jobs: ComponentsJobIn[], enabled: boolean) {
  return useQuery({
    queryKey: ["job-fit", "components", jobs.map((j) => `${j.jobId}:${j.fitScore ?? ""}`)],
    queryFn: () => getFitComponents(jobs),
    enabled: enabled && jobs.length > 0,
    staleTime: 60_000,
    retry: false,
  })
}

export function useGoalsWiring(enabled: boolean) {
  return useQuery({
    queryKey: ["goals", "wiring"],
    queryFn: getGoalsWiring,
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}
