/**
 * PRISM survey-request hooks (G8).
 *
 * Pairs with `@/services/prism/prism.ts` and the new G8 backend routes
 * (`POST /v1/prism/requests`, `GET /v1/prism/requests/me`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMyPrismRequests,
  requestPrismSurvey,
  type PrismSurveyRequestPayload,
} from '@/services/prism/prism'

/** Stable query key for "my PRISM requests" list — exported so consumers
 *  (and tests) can target it for invalidation / prefetch. */
export const myPrismRequestsKey = ['prism', 'requests', 'me'] as const

/** Mutation: `POST /v1/prism/requests` — invalidates the list on success. */
export function useRequestPrismSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PrismSurveyRequestPayload) =>
      requestPrismSurvey(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myPrismRequestsKey })
    },
  })
}

/** Query: `GET /v1/prism/requests/me` — staleTime 30s per G8 spec. */
export function useMyPrismRequests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: myPrismRequestsKey,
    queryFn: () => listMyPrismRequests(),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  })
}
