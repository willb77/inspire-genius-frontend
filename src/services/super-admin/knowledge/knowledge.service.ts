import { agentApi } from '@/lib/agentApi'

const BASE = '/v1/agents/documents'

// ── Types ──────────────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string
  filename: string
  file_type: string | null
  domain: string | null
  agent_id: string | null
  embedding_status: string | null
  chunk_count: number
  text_length: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface KnowledgeListResponse {
  documents: KnowledgeDocument[]
  total: number
  /**
   * Row count per domain, keyed by the same derived domain value the
   * `domain` filter accepts (including the `uncategorised` sentinel).
   * Not narrowed by the active domain filter — it is a facet, so every
   * chip can show its own count while one of them is selected.
   *
   * Optional: an agent-engine older than 2026-08-11 omits it, and the
   * page falls back to no counts rather than rendering zeroes.
   */
  domain_counts?: Record<string, number>
}

export interface KnowledgeListParams {
  domain?: string
  agent_id?: string
  /** MIME type, matched exactly against `documents.content_type`. */
  file_type?: string
  /** Case-insensitive substring of the document name (`documents.filename`). */
  search?: string
  /** ISO `YYYY-MM-DD`, inclusive lower bound on upload date. */
  start_date?: string
  /** ISO `YYYY-MM-DD`, inclusive upper bound on upload date. */
  end_date?: string
  limit?: number
  offset?: number
}

export interface KnowledgeUploadRequest {
  documents: {
    document_id: string
    title: string
    text: string
    source: string
    category: string
  }[]
}

export interface IngestResponse {
  success: boolean
  documents_processed: number
  total_chunks: number
  total_stored: number
  errors: string[]
}

export interface DeleteResponse {
  success: boolean
  document_id: string
  chunks_deleted: number
  message: string
}

export interface RevectorizeResponse {
  success: boolean
  document_id: string
  chunks_stored: number
  message: string
}

// ── Service functions ──────────────────────────────────────────────

export async function listKnowledgeDocuments(params: KnowledgeListParams = {}) {
  const { data } = await agentApi.get<KnowledgeListResponse>(BASE, { params })
  return data
}

export async function uploadKnowledgeDocument(request: KnowledgeUploadRequest) {
  const { data } = await agentApi.post<IngestResponse>(`${BASE}/ingest`, request)
  return data
}

export async function deleteKnowledgeDocument(docId: string) {
  const { data } = await agentApi.delete<DeleteResponse>(`${BASE}/${docId}`)
  return data
}

export async function revectorizeDocument(docId: string) {
  const { data } = await agentApi.post<RevectorizeResponse>(`${BASE}/${docId}/revectorize`)
  return data
}
