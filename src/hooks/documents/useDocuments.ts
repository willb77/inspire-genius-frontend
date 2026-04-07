/**
 * useDocuments — hooks for the new Document Service (v1/documents/*).
 *
 * Replaces the legacy file_service hooks (useListDocuments, useDownloadDocument,
 * useDeleteDocument, useBulkDeleteDocuments) which talk to /v1/file_service/*.
 *
 * The legacy hooks are kept for UploadDocumentsModal and any other pages that
 * haven't yet migrated.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listDocumentsV2,
  getDownloadUrl,
  deleteDocumentV2,
  searchDocuments,
} from "@/services/documents/documentService";
import { logAuditEvent } from "@/services/audit/audit.service";
import type { SearchRequest } from "@/services/documents/documentService";

// ─── Query key factory ─────────────────────────────────────────────────────

type UseDocumentsParams = {
  limit?: number;
  offset?: number;
  search?: string;
  doc_kind?: string;
  status?: string;
};

const QK = {
  list: (params: UseDocumentsParams) => ["documents", "list", params] as const,
  detail: (id: string) => ["documents", "detail", id] as const,
};

// ─── Hooks ─────────────────────────────────────────────────────────────────

/** Paginated document list from /v1/documents/. */
export function useDocuments(params: UseDocumentsParams = {}) {
  return useQuery({
    queryKey: QK.list(params),
    queryFn: () => listDocumentsV2(params),
    staleTime: 0,
    refetchOnMount: true,
    placeholderData: (prev) => prev,
  });
}

/** Get a presigned download URL for one document. */
export function useDownloadDocumentV2() {
  return useMutation({
    mutationKey: ["documents", "download"],
    mutationFn: (docId: string) => getDownloadUrl(docId),
  });
}

/** Delete a single document. Invalidates the full ["documents"] tree. */
export function useDeleteDocumentV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["documents", "delete"],
    mutationFn: (docId: string) => deleteDocumentV2(docId),
    onSuccess: (_resp, docId) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      logAuditEvent({
        action: "document_deleted",
        actor_email: "user",
        target_type: "document",
        extra_data: { file_id: docId },
      });
    },
  });
}

/** Delete multiple documents in parallel. Invalidates ["documents"] once. */
export function useBulkDeleteDocumentsV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docIds: string[]) =>
      Promise.all(docIds.map((id) => deleteDocumentV2(id))),
    onSuccess: (_resp, docIds) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      logAuditEvent({
        action: "document_deleted",
        actor_email: "user",
        target_type: "document",
        extra_data: { count: docIds.length, file_ids: docIds },
      });
    },
  });
}

/** Full-text + semantic search via POST /v1/documents/search. */
export function useSearchDocumentsV2() {
  return useMutation({
    mutationKey: ["documents", "search"],
    mutationFn: (req: SearchRequest) => searchDocuments(req),
  });
}
