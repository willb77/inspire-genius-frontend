/**
 * Culture Document Service — upload, list, delete org culture docs.
 *
 * Culture docs are stored as regular documents with doc_kind="corporate_culture"
 * and domain="cultural" in the backend. The document-service handles upload
 * and vectorization; this service layer adds culture-specific filters.
 */
import { api } from "@/lib/axios"

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

// ─── API calls ──────────────────────────────────────────────────

/** List culture documents for the current user's organization. */
export async function listCultureDocs(): Promise<CultureDocListResponse> {
  const resp = await api.get("/v1/documents/culture")
  const data = resp.data as { data?: CultureDocListResponse } & CultureDocListResponse
  return data.data ?? data
}

/** Upload a culture document.
 *
 * Uses multipart form upload via the monolith file_service,
 * tagging with category "corporate_culture".
 */
export async function uploadCultureDoc(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CultureDoc> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("file_type", "corporate_culture")
  formData.append("domain", "cultural")

  const resp = await api.post("/v1/file_service/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true,
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.floor((e.loaded / e.total) * 100))
      }
    },
  })
  const data = resp.data as { data?: CultureDoc } & CultureDoc
  return data.data ?? data
}

/** Delete a culture document. */
export async function deleteCultureDoc(documentId: string): Promise<void> {
  await api.delete(`/v1/file_service/${encodeURIComponent(documentId)}`, {
    withCredentials: true,
  })
}
