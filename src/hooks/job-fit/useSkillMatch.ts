import { useQuery } from "@tanstack/react-query"
import { getSkillMatch, getSkillMatchEnabled } from "@/services/job-fit/skillMatch.service"

export const skillMatchKeys = {
  enabled: ["skill-match", "enabled"] as const,
  forCode: (code: string) => ["skill-match", "code", code] as const,
}

/** `true` only when the server says Skills is on for this person. Loading, an
 * error and "off" all read as `false`, so the page renders as today. */
export function useSkillMatchEnabled(): boolean {
  const q = useQuery({
    queryKey: skillMatchKeys.enabled,
    queryFn: getSkillMatchEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}

/** My skills against one job's O*NET skills. Idle while `enabled` is false or
 * there is no code to ask about. */
export function useSkillMatch(onetSocCode: string | null | undefined, enabled: boolean) {
  const code = (onetSocCode ?? "").trim()
  return useQuery({
    queryKey: skillMatchKeys.forCode(code),
    queryFn: () => getSkillMatch(code),
    enabled: enabled && code.length > 0,
    staleTime: 30_000,
    retry: false,
  })
}
