import { useQuery } from "@tanstack/react-query"
import { getPractitionerProgrammeEnabled } from "@/services/switches/switches.service"

export const practitionerProgrammeSwitchKey = ["switches", "practitioner-programme"] as const

/**
 * `true` only when the server says the Practitioner Programme is on.
 * Loading, an error and "off" all read as `false`, so a control behind it
 * stays hidden rather than appearing and then failing.
 */
export function usePractitionerProgrammeEnabled(): boolean {
  const q = useQuery({
    queryKey: practitionerProgrammeSwitchKey,
    queryFn: getPractitionerProgrammeEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
