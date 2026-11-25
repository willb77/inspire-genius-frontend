import { useQuery } from "@tanstack/react-query"
import { getTeamDevelopmentRoster } from "@/services/manager/development/growthService"
import type { RosterMember } from "@/types/development"
import {
  connectedMembers,
  unconnectedClients,
  type RosterEntry,
  type UnconnectedClient,
} from "@/lib/practitionerRoster"
import { developmentKeys } from "./queryKeys"

/**
 * One fetch for both hooks below: the cache holds the server's cards as sent,
 * and each hook selects its own view of them.
 */
const rosterQuery = {
  queryKey: developmentKeys.roster(),
  queryFn: async (): Promise<RosterEntry[]> => {
    const r = await getTeamDevelopmentRoster()
    return (r.data?.data ?? []) as RosterEntry[]
  },
  staleTime: 60_000,
}

/**
 * Team roster for the Development Studio grid.
 *
 * TDS-U11b: only cards that name a person (a `memberId`). A practitioner's
 * client with no account yet (U11a, `memberId: null`) is NOT a member and is
 * read with {@link useUnconnectedClients} instead, so no consumer here ever
 * builds a page link from a null id. Today every card has an id, so this list
 * is exactly what the server sent.
 */
export function useTeamDevelopmentRoster() {
  return useQuery<RosterEntry[], Error, RosterMember[]>({ ...rosterQuery, select: connectedMembers })
}

/** TDS-U11b: the practitioner's clients who have not connected an account yet. */
export function useUnconnectedClients() {
  return useQuery<RosterEntry[], Error, UnconnectedClient[]>({ ...rosterQuery, select: unconnectedClients })
}
