/**
 * Prior approval for PRISM survey requests (2026-10-26).
 *
 * The server refuses `POST /v1/prism/requests` until the caller is authorised
 * (everyone, their organisation, or them). These hooks read that state up front,
 * so the page can say so before anyone fills in a form, and send the approval
 * request. The server is the gate; these only explain it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPrismRequestAccess,
  requestPrismAccess,
  type PrismRequestAccessState,
} from '@/services/prism/prism'

export const prismRequestAccessKey = ['prism', 'requests', 'access'] as const

export function usePrismRequestAccess(options?: { enabled?: boolean }) {
  return useQuery<PrismRequestAccessState>({
    queryKey: prismRequestAccessKey,
    queryFn: () => getPrismRequestAccess(),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  })
}

export function useRequestPrismAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { practitionerName: string; confirmIsMe: boolean }) =>
      requestPrismAccess(body),
    onSuccess: (state) => {
      queryClient.setQueryData(prismRequestAccessKey, state)
    },
  })
}
