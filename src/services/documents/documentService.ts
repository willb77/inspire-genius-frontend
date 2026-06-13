/**
 * Document Service client — presigned URL uploads, processing, list,
 * download, delete, search.
 *
 * Routes through API Gateway → /v1/documents/* → document-service Lambda,
 * which writes to Aurora `documents` + `document_chunks` (pgvector).
 *
 * Per the 2026-05-10 pgvector consolidation decision, this is the
 * canonical document path. The legacy monolith /v1/file_service/*
 * endpoints write to the doomed Milvus users_db and are being retired
 * with the monolith Alex agent (see `.claude/rules/agents.md` W.1).
 */
import { api } from "@/lib/axios";
import { agentApi } from "@/lib/agentApi";

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

/** Initiate upload — returns presigned S3 URL for direct upload.
 *
 * Posts to /v1/documents/upload on the document-service (via API Gateway).
 * Per the 2026-05-10 pgvector consolidation decision, this is the canonical
 * upload path; the monolith /v1/file_service/* path is being retired with
 * the monolith Alex agent and writes to the doomed Milvus users_db.
 */
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

/** Trigger server-side processing (scan, extract, chunk, embed → pgvector). */
export async function triggerProcessing(documentId: string): Promise<DocumentOut> {
  const resp = await api.post(`/v1/documents/${encodeURIComponent(documentId)}/process`);
  return (resp.data as { data: DocumentOut }).data;
}

/** List documents with pagination and filters.
 *
 * Hits document-service GET /v1/documents/ directly (pgvector-backed
 * `documents` table). Returns canonical DocumentListResponse shape.
 *
 * Per 2026-05-10 pgvector consolidation: document-service is the
 * source of truth. The legacy monolith /v1/file_service/list/v2
 * still exists but reads from the doomed Milvus users_db.
 */
export async function listDocumentsV2(params?: {
  user_id?: string;
  company_id?: string;
  doc_kind?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<DocumentListResponse> {
  const query: Record<string, unknown> = {
    limit: params?.limit ?? 20,
    offset: params?.offset ?? 0,
  };
  if (params?.company_id) query.company_id = params.company_id;
  if (params?.doc_kind) query.doc_kind = params.doc_kind;
  if (params?.status) query.status = params.status;
  if (params?.search) query.search = params.search;

  const resp = await api.get("/v1/documents/", { params: query });
  return (resp.data as { data: DocumentListResponse }).data;
}

/** Get a single document by ID. */
export async function getDocument(documentId: string): Promise<DocumentOut> {
  const resp = await api.get(`/v1/documents/${encodeURIComponent(documentId)}`);
  return (resp.data as { data: DocumentOut }).data;
}

/** Get presigned download URL from document-service. */
export async function getDownloadUrl(documentId: string): Promise<string> {
  const resp = await api.get(`/v1/documents/${encodeURIComponent(documentId)}/download`);
  // ApiResponse envelope: { status, data: { url } }
  const inner = ((resp.data as Record<string, unknown>)?.data ?? resp.data) as Record<string, unknown>;
  const url = (inner?.url ?? inner?.download_url ?? inner?.link) as string | undefined;
  if (typeof url === "string") return url;
  throw new Error("Unexpected download response shape");
}

/** Delete a document via document-service. */
export async function deleteDocumentV2(documentId: string): Promise<void> {
  await api.delete(`/v1/documents/${encodeURIComponent(documentId)}`);
}

/**
 * Reclassify a document the caller owns. Today only `doc_kind` is patchable
 * (allowlist: `'prism' | 'general'`). Powers the "Mark as My PRISM Rpt" UX
 * so a user can tag a CSV they uploaded via the generic upload flow as their
 * own PRISM when GET /latest-prism's heuristic can't find one.
 */
export async function patchDocument(
  documentId: string,
  patch: { doc_kind?: "prism" | "general" },
): Promise<DocumentOut> {
  const resp = await api.patch(
    `/v1/documents/${encodeURIComponent(documentId)}`,
    patch,
  );
  return (resp.data as { data: DocumentOut }).data;
}

// ─── Vectorization (Agent Engine) ───────────────────────────────

type VectorizeRequest = {
  document_id: string;
  text?: string;
  user_id: string;
  filename?: string;
  file_type?: string;
  /**
   * Optional alias used when the document_id is actually a monolith
   * `files.id`. The agent-engine endpoint will look up the file_key,
   * fetch from S3, extract text, create a documents row, and then
   * vectorize in one step.
   */
  file_id?: string;
  /**
   * S3 object key from the monolith upload response. When provided
   * (alongside the default monolith bucket), the agent-engine
   * vectorize endpoint fetches the file directly from S3, extracts
   * text, upserts the documents row, and chunks. Without this, the
   * endpoint can only vectorize documents already present in the
   * Aurora documents table.
   * Bug fix 2026-05-09 — uploads via the chat Document dialog
   * silently failed to vectorize because this field was missing.
   */
  file_key?: string;
  /** Optional S3 bucket override (defaults to inspires-genius-dev-documents). */
  s3_bucket?: string;
};

type VectorizeResponse = {
  document_id: string;
  chunks_stored: number;
  status: string;
  message: string;
};

/**
 * Latest PRISM CSV document for the authenticated user.
 *
 * Returned by GET /v1/documents/latest-prism on the agent-engine.
 * Used by Meridian chat to auto-attach the most recent PRISM upload
 * for context. A 404 with `detail: "no_prism_csv"` means the user has
 * not uploaded a PRISM CSV yet — callers should treat that as a normal,
 * non-retryable state rather than an error.
 */
type LatestPrismDocument = {
  document_id: string;
  file_name: string;
  uploaded_at: string;
};

/**
 * Trigger pgvector embedding for a document via the Agent Engine.
 *
 * Call this after the document-service has finished processing (text extraction).
 * The Agent Engine fetches the extracted_text from the shared Aurora DB and
 * generates OpenAI embeddings stored in the document_chunks table.
 *
 * This bridges the document-service processing pipeline to the RAG retriever.
 */
export async function vectorizeDocument(req: VectorizeRequest): Promise<VectorizeResponse> {
  const { data } = await agentApi.post<VectorizeResponse>(
    "/v1/agents/documents/vectorize",
    req,
  );
  return data;
}

/** Full-text + semantic search across documents. */
export async function searchDocuments(req: SearchRequest): Promise<SearchResponse> {
  const resp = await api.post("/v1/documents/search", req);
  return (resp.data as { data: SearchResponse }).data;
}

/**
 * Fetch the latest PRISM CSV document for the authenticated user.
 *
 * Routes through the agent-engine (agentApi), not API Gateway, because
 * the endpoint is defined on the agent-engine FastAPI app and reads from
 * the shared Aurora `documents` table to find the user's most recent
 * PRISM upload.
 *
 * Returns the document metadata on success. A 404 response with
 * `detail: "no_prism_csv"` indicates the user has not uploaded a PRISM
 * CSV yet — the calling hook treats this as a non-retryable state.
 */
export async function getLatestPrism(): Promise<LatestPrismDocument> {
  const { data } = await agentApi.get<LatestPrismDocument>(
    "/v1/documents/latest-prism",
  );
  return data;
}

export type {
  PresignedUrlRequest,
  PresignedUrlResponse,
  DocumentOut,
  DocumentListResponse,
  SearchRequest,
  SearchHit,
  SearchResponse,
  VectorizeRequest,
  VectorizeResponse,
  LatestPrismDocument,
};
