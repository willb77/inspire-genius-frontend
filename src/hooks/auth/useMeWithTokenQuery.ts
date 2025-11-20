import { useQuery } from '@tanstack/react-query'
import { getMeWithToken } from '@/services/auth.service'
import type { ApiEnvelope } from '@/types/auth/api-types'

export function useMeWithTokenQuery(token: string | null | undefined, enabledOverride?: boolean) {
  const enabled = Boolean(token) && (enabledOverride ?? true)
  return useQuery({
    queryKey: ['me-with-token', token],
    enabled,
    queryFn: async () => {
      const res = await getMeWithToken(token as string)
      return res as ApiEnvelope
    },
    staleTime: 60_000,
    retry: 1,
  })
}
