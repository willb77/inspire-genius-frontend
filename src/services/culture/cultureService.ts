/**
 * Culture Document Service — upload, list, delete org culture docs.
 *
 * Culture docs are regular documents tagged `doc_kind="corporate_culture"`.
 * Per the 2026-05-10 pgvector consolidation, all flows route at the
 * document-service via the B.2 presigned-URL pipeline (Aurora `documents`
 * + `document_chunks` / pgvector).
 *
 * The previous monolith path (`/v1/file_service/*`) wrote to the doomed
 * Milvus `users_db` and is being retired with the monolith Alex agent.
 */
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
  listDocumentsV2,
  deleteDocumentV2,
  type DocumentOut,
} from "@/services/documents/documentService"

// ─── Types ──────────────────────────────────────────────────────

export type CultureDoc = {
  id: string
  filename: string
  file_type: string
  status: string
  created_at: string
  updated_at: string
}

export type CultureDocListResponse = {
  documents: CultureDoc[]
  total: number
}

const CULTURE_DOC_KIND = "corporate_culture"

function toCultureDoc(d: DocumentOut): CultureDoc {
  return {
    id: d.id,
    filename: d.filename,
    file_type: d.doc_kind ?? d.content_type ?? "doc",
    status: d.status,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }
}

// ─── API calls ──────────────────────────────────────────────────

/** List culture documents (filtered server-side by doc_kind). */
export async function listCultureDocs(): Promise<CultureDocListResponse> {
  const result = await listDocumentsV2({
    doc_kind: CULTURE_DOC_KIND,
    limit: 100,
  })
  return {
    documents: result.documents.map(toCultureDoc),
    total: result.total,
  }
}

/** Upload a culture document via the B.2 presigned-URL flow.
 *
 * 1. POST /v1/documents/upload with doc_kind=corporate_culture → presigned URL
 * 2. PUT directly to S3 (no backend in upload byte path)
 * 3. POST /v1/documents/{id}/process → scan + extract + chunk + embed → pgvector
 */
export async function uploadCultureDoc(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CultureDoc> {
  const presigned = await initiateUpload({
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    file_size: file.size,
    doc_kind: CULTURE_DOC_KIND,
  })

  await uploadToS3(presigned.upload_url, presigned.upload_fields, file, onProgress)

  const doc = await triggerProcessing(presigned.document_id)
  return toCultureDoc(doc)
}

/** Delete a culture document. */
export async function deleteCultureDoc(documentId: string): Promise<void> {
  await deleteDocumentV2(documentId)
}
