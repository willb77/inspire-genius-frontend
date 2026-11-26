import { useQuery } from "@tanstack/react-query"
import { getGoalTargetsEnabled } from "@/services/switches/goalTargets.service"

/** `true` only when the server says goal targets are on. Loading, an error and
 * "off" all read as `false`, so every page renders as it does today.
 *
 * `enabled` (default `true`, so every existing caller is unchanged) lets a
 * caller that must not ask at all — Careers and Jobs C-b's plan block for an
 * account without `job-fit` — leave the read idle; idle reads as `false`. */
export function useGoalTargetsEnabled(enabled: boolean = true): boolean {
  const q = useQuery({
    queryKey: ["switches", "goal-targets"],
    queryFn: getGoalTargetsEnabled,
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  })
  return enabled && q.data === true
}
