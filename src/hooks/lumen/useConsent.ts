import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getConsent, updateConsent } from "@/services/lumen/consent.service"
import type { ConsentUpdate, LumenConsent } from "@/types/lumen"

const CONSENT_KEY = ["lumen", "consent"] as const

/** The caller's proactive-guidance consent. */
export function useConsent(
  options?: Partial<UseQueryOptions<LumenConsent | undefined, AxiosError>>
) {
  return useQuery<LumenConsent | undefined, AxiosError>({
    queryKey: CONSENT_KEY,
    queryFn: async () => {
      const res = await getConsent()
      return res.data
    },
    ...options,
  })
}

/**
 * Update consent.
 *
 * Writes the server's response straight into the cache rather than only
 * invalidating: a consent toggle should settle immediately, and a refetch round
 * trip would leave the switch visibly lagging the user's click.
 */
export function useUpdateConsent() {
  const queryClient = useQueryClient()
  return useMutation<LumenConsent | undefined, AxiosError, ConsentUpdate>({
    mutationFn: async (updates) => {
      const res = await updateConsent(updates)
      return res.data
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(CONSENT_KEY, data)
    },
  })
}
