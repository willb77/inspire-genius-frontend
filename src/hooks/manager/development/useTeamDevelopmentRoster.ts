import { useQuery } from "@tanstack/react-query"
import { getTeamDevelopmentRoster } from "@/services/manager/development/growthService"
import type { RosterMember } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/** Team roster for the Development Studio grid. */
export function useTeamDevelopmentRoster() {
  return useQuery<RosterMember[]>({
    queryKey: developmentKeys.roster(),
    queryFn: async () => {
      const r = await getTeamDevelopmentRoster()
      return r.data?.data ?? []
    },
    staleTime: 60_000,
  })
}
