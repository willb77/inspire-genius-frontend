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

export type ReplaceReportResult = {
  status: boolean
  assessment_id: string
  scores_written: number
  colours: { gold?: number; green?: number; blue?: number; orange?: number }
  pdf_replaced: boolean
  // PRISM-RR P2 — present only when `prism_pdf_replace` is on for the caller.
  csv_generated?: boolean
  report_type?: string | null
  conversion_warnings?: number
  sections_removed?: string[]
  csv_document_id?: string | null
}

/**
 * Self-service: replace the caller's OWN PRISM scores. Deletes the caller's
 * prior PRISM assessment + prism_results and writes the uploaded one — the
 * caller can only ever replace their own data (the backend keys on the token
 * subject).
 *
 * With `prism_pdf_replace` off this needs the CSV (the PDF is optional). With it
 * on, either file will do: a PDF on its own is converted to the CSV server-side.
 * `confirmSectionLoss` answers the 409 the server returns when the new report
 * lacks sections (Emotional Intelligence, Big Five, Mental Toughness, Core
 * Traits) the caller has today.
 */
export async function replaceMyPrismReport(
  csv: File | null,
  pdf?: File | null,
  opts?: { confirmSectionLoss?: boolean },
): Promise<ReplaceReportResult> {
  const form = new FormData()
  if (csv) form.append('csv', csv)
  if (pdf) form.append('pdf', pdf)
  if (opts?.confirmSectionLoss) form.append('confirm_section_loss', 'true')
  const resp = await api.post<ReplaceReportResult>(
    `${BASE}/report/me/replace`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return resp.data
}

/** Super-admin: upload a PRISM report PDF for a specific user. */
export async function adminUploadUserPrismPdf(
  userId: string,
  pdf: File,
): Promise<{ status: boolean; s3_key: string; file_size: number }> {
  const form = new FormData()
  form.append('file', pdf)
  const resp = await api.post(
    `/v1/profile/admin/users/${userId}/prism-pdf`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return resp.data
}

/** Super-admin: delete a user's PRISM report PDF(s). */
export async function adminDeleteUserPrismPdf(
  userId: string,
): Promise<{ status: boolean; deleted_document_rows: number }> {
  const resp = await api.delete(`/v1/profile/admin/users/${userId}/prism-pdf`)
  return resp.data
}

export type PrismScoresDeleteResult = {
  status: boolean
  user_id: string
  deleted_assessments: number
  deleted_scores: number
  deleted_typings: number
  deleted_prism_results: number
  deleted_csv_documents: number
}

/**
 * Super-admin: hard-delete a user's PRISM scores and their PRISM CSV documents.
 * Never the report PDF (that has its own Upload / Delete PRISM PDF action).
 * 403 while `prism_pdf_replace` is off for the user. Not restorable.
 */
export async function adminDeleteUserPrismScores(
  userId: string,
): Promise<PrismScoresDeleteResult> {
  const resp = await api.delete<PrismScoresDeleteResult>(
    `/v1/profile/admin/users/${userId}/prism-scores`,
  )
  return resp.data
}
