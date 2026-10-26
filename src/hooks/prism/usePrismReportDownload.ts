import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
import {
  adminDeleteUserPrismPdf,
  adminDeleteUserPrismScores,
  adminUploadUserPrismPdf,
  getMyPrismReport,
  getMyPrismReportDownloadUrl,
  getPrismReportDownloadUrl,
  replaceMyPrismReport,
  type MyPrismReport,
  type PrismReportDownload,
  type PrismScoresDeleteResult,
  type ReplaceReportResult,
} from '@/services/prism/prismReport.service'

/**
 * The caller's latest ingested PRISM report (the real PRISM PDF/CSV from the
 * poll-ingest pipeline). Used to decide whether to show a "Download PRISM
 * Report" button. Returns `{ available: false }` when nothing has been
 * ingested yet (a 404-free steady state — the route always 200s).
 */
export function useMyPrismReport(enabled = true) {
  return useQuery<MyPrismReport>({
    queryKey: ['prism', 'report', 'me'],
    queryFn: getMyPrismReport,
    enabled,
    staleTime: 60_000,
    // A brand-new account legitimately has no report; don't hammer on failure.
    retry: false,
  })
}

/**
 * Fetch a fresh 5-minute presigned URL for one PRISM artifact on demand.
 * Presigned URLs expire, so this is a mutation (fetch at click time) rather
 * than a cached query.
 */
export function usePrismReportDownloadUrl() {
  return useMutation<
    PrismReportDownload,
    unknown,
    { requestId: string; kind?: 'pdf' | 'csv' }
  >({
    mutationFn: ({ requestId, kind = 'pdf' }) =>
      getPrismReportDownloadUrl(requestId, kind),
  })
}

/**
 * Fetch a fresh presigned URL for the caller's own PRISM report WITHOUT a
 * request id. Use this for the "my report" surfaces: the backend resolver finds
 * the caller's best real PDF (ingested artifact, uploaded document, or one
 * rendered from their scores), so it works even when there is no poll-ingest row
 * — the case that previously showed "your PRISM report isn't ready".
 */
export function useMyPrismReportDownloadUrl() {
  return useMutation<PrismReportDownload, unknown, { kind?: 'pdf' | 'csv' } | void>({
    mutationFn: (vars) => getMyPrismReportDownloadUrl(vars?.kind ?? 'pdf'),
  })
}

type _ApiError = Error & {
  response?: { status?: number; data?: { detail?: unknown } }
}

/**
 * A readable message from an API error. Adds one shape to
 * {@link apiErrorMessage} (strings and FastAPI 422 lists): the PRISM-RR replace
 * route's `{code, message}` object, whose `message` is the reason to show.
 * Passed raw it rendered as "[object Object]".
 */
export function errorDetail(error: unknown): string {
  const detail = (error as _ApiError)?.response?.data?.detail
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const msg = (detail as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return apiErrorMessage(error, 'Something went wrong')
}

const _errDetail = errorDetail

/**
 * The sections a replace would remove, when the server refused it with
 * `409 {code: "section_loss", sections}` — or `null` for any other error. The
 * replace dialog asks the user to confirm and resubmits with
 * `confirmSectionLoss`.
 */
export function sectionLossOf(error: unknown): string[] | null {
  const e = error as _ApiError
  if (e?.response?.status !== 409) return null
  const detail = e.response?.data?.detail as { code?: unknown; sections?: unknown } | undefined
  if (!detail || detail.code !== 'section_loss') return null
  return Array.isArray(detail.sections)
    ? detail.sections.filter((s): s is string => typeof s === 'string')
    : []
}

export type ReplacePrismVars = {
  csv?: File | null
  pdf?: File | null
  confirmSectionLoss?: boolean
}

/**
 * Self-service replace of the caller's own PRISM data — a CSV, a PDF, or both
 * (a PDF on its own only while `prism_pdf_replace` is on). Invalidates every
 * query that shows PRISM so each surface refreshes at once.
 */
export function useReplaceMyPrismReport() {
  const qc = useQueryClient()
  return useMutation<ReplaceReportResult, unknown, ReplacePrismVars>({
    mutationFn: ({ csv, pdf, confirmSectionLoss }) =>
      replaceMyPrismReport(csv ?? null, pdf ?? null, { confirmSectionLoss }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['prism', 'report', 'me'] })
      qc.invalidateQueries({ queryKey: ['prism-history'] })
      qc.invalidateQueries({ queryKey: ['prism-report'] })
      // The surface that shows "do you have a PRISM report?" — HomeV2's
      // Personal Info tile and the chat auto-attach — reads THIS key, and it
      // caches for 5 minutes with `refetchOnWindowFocus: false`. Without this
      // line a successful replace leaves the tile showing the pre-import state
      // until a hard reload, which reads as "it didn't work".
      qc.invalidateQueries({ queryKey: ['documents', 'latest-prism'] })
      // The Behavioral map (Powered by PRISM card) and the Prism Data pill's
      // Brain Map read the scores through THIS key (5-min staleTime). It was
      // never invalidated, so both showed the old map after a replace.
      qc.invalidateQueries({ queryKey: ['me', 'prism'] })
      const what = data.csv_generated ? 'from your PDF' : 'replaced'
      toast.success(
        `PRISM data ${what} — ${data.scores_written} scores` +
          (data.pdf_replaced ? ' + PDF updated.' : '.'),
      )
    },
    onError: (error) => {
      // The section-loss 409 is a question for the user, not a failure: the
      // dialog shows the sections and offers to replace anyway.
      if (sectionLossOf(error)) return
      toast.error(`Replace failed: ${_errDetail(error)}`)
    },
  })
}

/**
 * Super-admin: delete a user's PRISM scores and PRISM CSV documents (never the
 * PDF). Hard delete — the caller confirms first.
 */
export function useAdminDeletePrismScores() {
  const qc = useQueryClient()
  return useMutation<PrismScoresDeleteResult, unknown, { userId: string }>({
    mutationFn: ({ userId }) => adminDeleteUserPrismScores(userId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['prism-history'] })
      if (data.deleted_assessments === 0 && data.deleted_prism_results === 0) {
        toast.info('No PRISM scores were found for this user. Nothing was deleted.')
        return
      }
      toast.success(
        `Deleted the user's PRISM scores (${data.deleted_assessments} assessment(s)) and ` +
          `${data.deleted_csv_documents} CSV document(s). The report PDF was kept.`,
      )
    },
    onError: (error) => toast.error(`Delete failed: ${_errDetail(error)}`),
  })
}

/** Super-admin: upload a PRISM report PDF for a specific user. */
export function useAdminUploadPrismPdf() {
  return useMutation<
    { status: boolean; s3_key: string; file_size: number },
    unknown,
    { userId: string; pdf: File }
  >({
    mutationFn: ({ userId, pdf }) => adminUploadUserPrismPdf(userId, pdf),
    onSuccess: () => toast.success('PRISM PDF uploaded for the user.'),
    onError: (error) => toast.error(`Upload failed: ${_errDetail(error)}`),
  })
}

/** Super-admin: delete a user's PRISM report PDF(s). */
export function useAdminDeletePrismPdf() {
  return useMutation<
    { status: boolean; deleted_document_rows: number },
    unknown,
    { userId: string }
  >({
    mutationFn: ({ userId }) => adminDeleteUserPrismPdf(userId),
    onSuccess: (data) =>
      toast.success(
        `Deleted ${data.deleted_document_rows} PRISM PDF document(s) for the user.`,
      ),
    onError: (error) => toast.error(`Delete failed: ${_errDetail(error)}`),
  })
}
