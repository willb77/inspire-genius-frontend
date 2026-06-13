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
  patchDocument,
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

/**
 * Reclassify the caller's document via PATCH /v1/documents/{id}.
 * Used by "Mark as My PRISM Rpt" so a user can self-tag a CSV they
 * uploaded as their own PRISM when the auto-attach heuristic
 * (GET /latest-prism) couldn't find one. Invalidates ["documents"]
 * so the list re-renders with the new doc_kind and the next
 * GET /latest-prism call sees the freshly-tagged row.
 */
export function useMarkDocumentAsPrism() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["documents", "patch", "mark-as-prism"],
    mutationFn: (docId: string) => patchDocument(docId, { doc_kind: "prism" }),
    onSuccess: (_doc, docId) => {
      // Invalidates both the document list and the latest-prism query
      // (queryKey: ["documents", "latest-prism"]) so the Meridian chat
      // badge picks up the new tag.
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      logAuditEvent({
        action: "document_marked_as_prism",
        actor_email: "user",
        target_type: "document",
        extra_data: { file_id: docId },
      });
    },
  });
}
