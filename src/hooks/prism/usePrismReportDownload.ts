import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  adminDeleteUserPrismPdf,
  adminUploadUserPrismPdf,
  getMyPrismReport,
  getMyPrismReportDownloadUrl,
  getPrismReportDownloadUrl,
  replaceMyPrismReport,
  type MyPrismReport,
  type PrismReportDownload,
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

function _errDetail(error: unknown): string {
  const e = error as Error & { response?: { data?: { detail?: string } } }
  return e?.response?.data?.detail ?? e?.message ?? 'Something went wrong'
}

/**
 * Self-service replace of the caller's own PRISM data (CSV scores + optional
 * PDF). Invalidates the report + history queries so every surface refreshes.
 */
export function useReplaceMyPrismReport() {
  const qc = useQueryClient()
  return useMutation<ReplaceReportResult, unknown, { csv: File; pdf?: File | null }>({
    mutationFn: ({ csv, pdf }) => replaceMyPrismReport(csv, pdf),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['prism', 'report', 'me'] })
      qc.invalidateQueries({ queryKey: ['prism-history'] })
      qc.invalidateQueries({ queryKey: ['prism-report'] })
      toast.success(
        `PRISM data replaced — ${data.scores_written} scores` +
          (data.pdf_replaced ? ' + PDF updated.' : '.'),
      )
    },
    onError: (error) => toast.error(`Replace failed: ${_errDetail(error)}`),
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
