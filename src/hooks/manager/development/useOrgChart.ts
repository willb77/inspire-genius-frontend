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
      return r.data?.data ?? { nodes: [], viewerId: null, truncated: false }
    },
    staleTime: 5 * 60_000,
  })
}
