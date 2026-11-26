import { useQuery } from "@tanstack/react-query"

import { getPractitionerClientRosterEnabled } from "@/services/switches/practitionerClientRoster.service"

export const practitionerClientRosterSwitchKey = ["switches", "practitioner-client-roster"] as const

/**
 * RM-6 B: the practitioner's front page follows this switch.
 *
 * `data` is `true` only when the server says the Studio lists the practitioner's
 * clients. Off, a 404 (route not deployed on this tier) and an error all read
 * `false`, so the practitioner keeps today's menu, landing and Studio. Pass
 * `enabled = false` for any other role: no request is made and it reads off.
 */
export function usePractitionerClientRosterStatus(enabled = true) {
  return useQuery({
    queryKey: practitionerClientRosterSwitchKey,
    queryFn: getPractitionerClientRosterEnabled,
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  })
}

/** `true` only when the server says so; loading, error and off are `false`. */
export function usePractitionerClientRosterEnabled(enabled = true): boolean {
  return usePractitionerClientRosterStatus(enabled).data === true
}
