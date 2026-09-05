import { useQuery } from "@tanstack/react-query"
import { getOrgChart } from "@/services/manager/development/growthService"
import type { OrgChartResponse } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/**
 * The caller's own organisation's reporting tree.
 *
 * One plain read — no agent, no dossier compute — so it returns in a single
 * round trip rather than the ~60s a member dossier can cost. Cached for the
 * session: reporting lines change on the scale of weeks, not clicks.
 */
export function useOrgChart() {
  return useQuery<OrgChartResponse>({
    queryKey: developmentKeys.orgChart(),
    queryFn: async () => {
      const r = await getOrgChart()
      // `orgResolved: true` on the fallback: a missing BODY is a transport
      // problem, already reported as `isError`. Defaulting it to false here
      // would put "we could not identify your organisation" on screen for
      // what is actually a network failure.
      return (
        r.data?.data ?? { nodes: [], viewerId: null, truncated: false, orgResolved: true }
      )
    },
    staleTime: 5 * 60_000,
  })
}
