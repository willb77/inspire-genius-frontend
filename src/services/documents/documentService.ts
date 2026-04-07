/**
 * Document Service client — presigned URL uploads, processing, search.
 *
 * Talks to the new Document Service Lambda (v1/documents/*).
 * The legacy fileService.ts talks to the monolith (v1/file_service/*).
 */
import { api } from "@/lib/axios";

// ─── Types ──────────────────────────────────────────────────────

type PresignedUrlRequest = {
  filename: string;
  content_type: string;
  file_size: number;
  doc_kind?: string;
  company_id?: string;
  tags?: string[];
};

type PresignedUrlResponse = {
  document_id: string;
  upload_url: string;
  upload_fields: Record<string, string>;
  s3_key: string;
  expires_in: number;
};

type DocumentOut = {
  id: string;
  user_id: string;
  company_id: string | null;
  filename: string;
  content_type: string;
  file_size: number;
  status: string;
  status_detail: string | null;
  page_count: number | null;
  chunk_count: number;
  doc_kind: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type DocumentListResponse = {
  documents: DocumentOut[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

type SearchRequest = {
  query: string;
  user_id?: string;
  company_id?: string;
  doc_kind?: string;
  limit?: number;
  use_semantic?: boolean;
};

type SearchHit = {
  document_id: string;
  filename: string;
  chunk_content: string;
  chunk_index: number;
  page_number: number | null;
  score: number;
};

type SearchResponse = {
  hits: SearchHit[];
  total: number;
  query: string;
};

// ─── API calls ──────────────────────────────────────────────────

/** Initiate upload — returns presigned S3 URL for direct upload. */
export async function initiateUpload(req: PresignedUrlRequest): Promise<PresignedUrlResponse> {
  const resp = await api.post("/v1/documents/upload", req);
  return (resp.data as { data: PresignedUrlResponse }).data;
}

/** Upload a file using the presigned URL from initiateUpload. */
export async function uploadToS3(
  uploadUrl: string,
  fields: Record<string, string>,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  formData.append("file", file);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", uploadUrl, true);

  if (onProgress) {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.floor((e.loaded / e.total) * 100));
      }
    });
  }

  return new Promise((resolve, reject) => {
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(formData);
  });
}

/** Trigger server-side processing (scan, extract, chunk). */
export async function triggerProcessing(documentId: string): Promise<DocumentOut> {
  const resp = await api.post(`/v1/documents/${encodeURIComponent(documentId)}/process`);
  return (resp.data as { data: DocumentOut }).data;
}

/** List documents with pagination and filters. */
export async function listDocumentsV2(params?: {
  user_id?: string;
  company_id?: string;
  doc_kind?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<DocumentListResponse> {
  const resp = await api.get("/v1/documents/", { params });
  return (resp.data as { data: DocumentListResponse }).data;
}

/** Get a single document by ID. */
export async function getDocument(documentId: string): Promise<DocumentOut> {
  const resp = await api.get(`/v1/documents/${encodeURIComponent(documentId)}`);
  return (resp.data as { data: DocumentOut }).data;
}

/** Get presigned download URL. */
export async function getDownloadUrl(documentId: string): Promise<string> {
  const resp = await api.get(`/v1/documents/${encodeURIComponent(documentId)}/download`);
  const data = (resp.data as { data: { url: string } }).data;
  return data.url;
}

/** Delete a document. */
export async function deleteDocumentV2(documentId: string): Promise<void> {
  await api.delete(`/v1/documents/${encodeURIComponent(documentId)}`);
}

/** Full-text + semantic search across documents. */
export async function searchDocuments(req: SearchRequest): Promise<SearchResponse> {
  const resp = await api.post("/v1/documents/search", req);
  return (resp.data as { data: SearchResponse }).data;
}

export type {
  PresignedUrlRequest,
  PresignedUrlResponse,
  DocumentOut,
  DocumentListResponse,
  SearchRequest,
  SearchHit,
  SearchResponse,
};
