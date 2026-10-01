import { useQuery } from "@tanstack/react-query"
import { getGoalTargetsEnabled } from "@/services/switches/goalTargets.service"

/** `true` only when the server says goal targets are on. Loading, an error and
 * "off" all read as `false`, so every page renders as it does today. */
export function useGoalTargetsEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "goal-targets"],
    queryFn: getGoalTargetsEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
