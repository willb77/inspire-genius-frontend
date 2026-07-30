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
  const items: PrismRequestRow[] = q.data?.rows ?? []

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
    requested_at: latest?.requested_at ?? latest?.created_at ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
  }
}

/** Shape returned by {@link useActivePrismRequests}. */
export type ActivePrismRequest = {
  row: PrismRequestRow
  /** The questionnaire link. PRISM leaves ActionURL1 empty for a freshly
   *  created candidate and puts the link in ActionURL2, so read both. */
  questionnaireUrl: string | null
}

/** Hook: the caller's still-open PRISM requests (one per questionnaire type),
 *  each with its questionnaire link resolved.
 *
 *  Exists because the link was previously shown exactly once — in the submit
 *  success card — and was unrecoverable from the UI after a reload, even
 *  though the row and both ActionURLs are persisted and returned by
 *  `GET /v1/prism/requests/me`.
 *
 *  "Open" means `completed_at` is unset. Sorted newest first. Wraps
 *  {@link useMyPrismRequests}, so it costs no extra network call. */
export function useActivePrismRequests(): {
  active: ActivePrismRequest[]
  isLoading: boolean
  isError: boolean
} {
  const q = useMyPrismRequests()
  const rows: PrismRequestRow[] = q.data?.rows ?? []

  const active = rows
    .filter((r) => !r.completed_at)
    .sort((a, b) => {
      const at = a.requested_at ?? a.created_at ?? ''
      const bt = b.requested_at ?? b.created_at ?? ''
      if (at === bt) return 0
      if (!at) return 1
      if (!bt) return -1
      return at < bt ? 1 : -1
    })
    .map((row) => ({
      row,
      questionnaireUrl: row.action_url_1 || row.action_url_2 || null,
    }))

  return { active, isLoading: q.isLoading, isError: q.isError }
}
