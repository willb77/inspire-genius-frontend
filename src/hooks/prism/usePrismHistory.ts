import { useQuery } from '@tanstack/react-query'
import { getUserAssessments } from '@/services/prism/prism.service'

/**
 * `GET /v1/prism/history/{userId}` has no backend implementation — 404s on
 * the monolith catch-all. Disabled by default. See IG_backlog.md #10.U.
 *
 * To re-enable: remove the `false &&` guard once the PRISM history route is
 * built (likely in agent-engine where Aura owns PRISM data, or a monolith
 * bridge endpoint).
 */
export function usePrismHistory(userId: string | null) {
  return useQuery({
    queryKey: ['prism-history', userId],
    queryFn: () => getUserAssessments(userId!),
    enabled: false && !!userId,
  })
}
