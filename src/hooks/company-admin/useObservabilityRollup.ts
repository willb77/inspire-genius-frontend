import { useQuery } from "@tanstack/react-query"
import { getOrgRollups } from "@/services/observability/observability.service"
import type { OrgRollups } from "@/types/observability"

/**
 * Company-admin dashboard org-wide rollups — Surface 4 (wiring plan §4).
 *
 * Wraps `GET /v1/observability/org-rollups`. Backend caches results for
 * 5 minutes per (org_id, day-bucket); we mirror that with a 5-minute
 * React Query `staleTime` so the dashboard tiles don't refetch on every
 * remount within the cache window.
 *
 * `orgId` is optional. When omitted the backend returns the caller's
 * implicit org (today: org-scoping is not yet wired through the
 * observability tables — placeholder for future per-org scoping).
 */
export function useObservabilityRollup(orgId?: string) {
  return useQuery<OrgRollups | null>({
    queryKey: ["company-admin", "observability-rollup", orgId],
    queryFn: () => getOrgRollups({ org_id: orgId }),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}
