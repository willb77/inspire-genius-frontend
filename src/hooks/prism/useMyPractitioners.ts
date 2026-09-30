/**
 * The caller's own practitioners, for the "share my results" option on the
 * PRISM request form (`GET /v1/agents/practitioner-registry/mine`).
 */
import { useQuery } from '@tanstack/react-query'
import { getMyPractitioners } from '@/services/prism/prism'

export const myPractitionersKey = ['prism', 'my-practitioners'] as const

export function useMyPractitioners(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: myPractitionersKey,
    queryFn: getMyPractitioners,
    staleTime: 60_000,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}
