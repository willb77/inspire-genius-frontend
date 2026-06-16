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
  type PrismIngestStatus,
  type PrismRequestRow,
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

/** Shape returned by {@link useLatestPrismStatus}. */
export type LatestPrismStatus = {
  /** The most recent PRISM request row, or `null` when the user has none. */
  latest: PrismRequestRow | null
  /** Convenience boolean — true when ingest pipeline has produced an
   *  ingestible PRISM result (G9 P2 sets `ingest_status === 'done'`). */
  hasReadyPrism: boolean
  // ── Convenience accessors (also available on `latest`) ──
  ingest_status: PrismIngestStatus | null
  completed_at: string | null
  csv_s3_key: string | null
  pdf_s3_key: string | null
  requested_at: string | null
  // ── React Query passthrough ─────────────────────────────
  isLoading: boolean
  isError: boolean
}

/** Hook: returns the latest PRISM request row (by `requested_at`/`created_at`)
 *  plus G9 P2 ingest fields and a `hasReadyPrism` convenience boolean.
 *
 *  Wraps {@link useMyPrismRequests} — no extra network calls. The latest
 *  row is selected by `requested_at` (G9), falling back to `created_at`
 *  (G8) when the backend hasn't been migrated yet. */
export function useLatestPrismStatus(): LatestPrismStatus {
  const q = useMyPrismRequests()
  const items: PrismRequestRow[] = q.data?.items ?? []

  // Sort by requested_at, then created_at, descending. Rows without
  // either timestamp sort to the end (treated as oldest).
  const sorted = [...items].sort((a, b) => {
    const at = a.requested_at ?? a.created_at ?? ''
    const bt = b.requested_at ?? b.created_at ?? ''
    if (at === bt) return 0
    if (!at) return 1
    if (!bt) return -1
    return at < bt ? 1 : -1
  })

  const latest = sorted[0] ?? null
  const ingest_status = latest?.ingest_status ?? null
  const hasReadyPrism = ingest_status === 'done'

  return {
    latest,
    hasReadyPrism,
    ingest_status,
    completed_at: latest?.completed_at ?? null,
    csv_s3_key: latest?.csv_s3_key ?? null,
    pdf_s3_key: latest?.pdf_s3_key ?? null,
    requested_at: latest?.requested_at ?? latest?.created_at ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
  }
}
