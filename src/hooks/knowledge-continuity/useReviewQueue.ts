import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getReviewQueue } from "@/services/knowledge-continuity/continuity.service"
import type { ReviewQueue } from "@/types/knowledge-continuity"

/** Query key prefix shared with the review-queue mutations for cache invalidation. */
export const reviewQueueKey = (orgId?: string) =>
  ["knowledge-continuity", "review-queue", orgId ?? "all"] as const

const EMPTY_QUEUE: ReviewQueue = { needs_review_units: [], unresolved_contradictions: [] }

/** Units awaiting SME/practitioner review (GET /v1/trainer/continuity/review-queue). */
export function useReviewQueue(
  orgId?: string,
  options?: Partial<UseQueryOptions<ReviewQueue, AxiosError>>
) {
  return useQuery<ReviewQueue, AxiosError>({
    queryKey: reviewQueueKey(orgId),
    queryFn: async () => {
      const res = await getReviewQueue(orgId)
      return res.data ?? EMPTY_QUEUE
    },
    ...options,
  })
}
