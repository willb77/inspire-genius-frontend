import { useMutation, useQuery } from '@tanstack/react-query'
import {
  getMyPrismReport,
  getMyPrismReportDownloadUrl,
  getPrismReportDownloadUrl,
  type MyPrismReport,
  type PrismReportDownload,
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
