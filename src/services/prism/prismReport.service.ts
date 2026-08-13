import { api } from '@/lib/axios'

/**
 * Download of the *real* PRISM report (the genuine PRISM Brain Mapping PDF the
 * candidate completed) — distinct from the docgen "Self-Portrait" narrative.
 *
 * Backed by the agent-engine G9 poll-ingest pipeline
 * (`services/agent-engine/app/routes/prism_report_download.py`), reached through
 * the API Gateway `ANY /v1/prism/{proxy+}` route. These endpoints return raw
 * JSON (no BaseApiResponse envelope).
 */

const BASE = '/v1/prism'

export type MyPrismReport = {
  available: boolean
  request_id?: string | null
  completed_at?: string | null
  ingest_status?: string | null
  pdf_available?: boolean
  csv_available?: boolean
  /** PRISM-portal ActionURL1 from UnlockReport (§5.2) — retrieve on PRISM's side. */
  portal_url?: string | null
}

export type PrismReportDownload = {
  status: boolean
  url: string
  kind: 'pdf' | 'csv'
  filename: string
  expires_in: number
}

/** The caller's latest ingested PRISM report (availability + portal URL). */
export async function getMyPrismReport(): Promise<MyPrismReport> {
  const resp = await api.get<MyPrismReport>(`${BASE}/report/me`)
  return resp.data
}

/** A short-lived presigned S3 URL for the caller's own PRISM PDF or CSV. */
export async function getPrismReportDownloadUrl(
  requestId: string,
  kind: 'pdf' | 'csv' = 'pdf',
): Promise<PrismReportDownload> {
  const resp = await api.get<PrismReportDownload>(
    `${BASE}/requests/${requestId}/report/download`,
    { params: { kind } },
  )
  return resp.data
}

/**
 * Request-independent download of the caller's own PRISM report.
 *
 * Unlike {@link getPrismReportDownloadUrl}, this needs no `request_id`, so it
 * works for candidates who have no poll-ingest row at all (e.g. a report that
 * arrived via CSV import). The backend resolver serves the caller's best real
 * PDF — an ingested artifact, a genuine uploaded PRISM PDF, or one rendered from
 * their scores — so it never returns the header-only placeholder.
 */
export async function getMyPrismReportDownloadUrl(
  kind: 'pdf' | 'csv' = 'pdf',
): Promise<PrismReportDownload> {
  const resp = await api.get<PrismReportDownload>(
    `${BASE}/report/me/download`,
    { params: { kind } },
  )
  return resp.data
}
