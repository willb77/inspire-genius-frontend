import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
  vectorizeDocument,
} from "@/services/documents/documentService";
import type { DocumentOut } from "@/services/documents/documentService";
import { uploadDocuments } from "@/services/documents/fileService";
import { logAuditEvent } from "@/services/audit/audit.service";

/**
 * Single-file upload via the proven monolith multipart endpoint
 * (POST /v1/file_service/upload). The monolith handles S3 storage,
 * virus scanning, text extraction, and Milvus embedding internally.
 *
 * The new presigned-URL flow (initiateUpload + S3 PUT + triggerProcessing)
 * targets a Lambda + API Gateway + document-service infrastructure that
 * is not yet wired up end-to-end. Until the document-service Lambda is
 * deployed and routed in API Gateway, fall back to the monolith path
 * which is the only reliable upload route in production today.
 *
 * Best-effort: also triggers pgvector embedding via the Agent Engine
 * after upload so the new RAG pipeline can retrieve from pgvector.
 * Vectorization failure does NOT fail the upload — the file is safely
 * stored regardless.
 */
export function useDocumentUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["documents", "upload"],
    mutationFn: async (args: {
      file: File;
      docKind?: string;
      companyId?: string;
      tags?: string[];
      onProgress?: (pct: number) => void;
    }): Promise<DocumentOut> => {
      // Multipart upload to monolith — proven working path.
      const resp = (await uploadDocuments([args.file], args.onProgress)) as
        | {
            uploaded_files?: Array<{
              file_id?: string;
              filename?: string;
              file_type?: string;
              file_key?: string;
            }>;
          }
        | undefined;

      const uploaded = resp?.uploaded_files?.[0];
      const doc: DocumentOut = {
        id: String(uploaded?.file_id ?? ""),
        user_id: "",
        company_id: args.companyId ?? null,
        filename: uploaded?.filename ?? args.file.name,
        content_type: uploaded?.file_type ?? args.file.type ?? "",
        file_size: args.file.size,
        status: "ready",
        status_detail: null,
        page_count: null,
        chunk_count: 0,
        doc_kind: args.docKind ?? uploaded?.file_type ?? "doc",
        tags: args.tags ?? null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Best-effort pgvector embedding via Agent Engine.
      try {
        if (doc.id) {
          await vectorizeDocument({
            document_id: doc.id,
            user_id: doc.user_id,
            filename: doc.filename,
            file_type: doc.content_type,
          });
        }
      } catch (err) {
        console.warn(
          "[useDocumentUpload] Vectorization failed (file uploaded successfully):",
          err,
        );
      }

      return doc;
    },
    onSuccess: (_doc, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
      logAuditEvent({
        action: "document_uploaded",
        actor_email: "user",
        target_type: "document",
        extra_data: { filename: variables.file.name },
      });
    },
  });
}

// initiateUpload, uploadToS3, triggerProcessing are intentionally retained
// in imports for the time when the document-service Lambda is wired up.
// Suppress unused-symbol warnings until they are reactivated.
void initiateUpload;
void uploadToS3;
void triggerProcessing;

/**
 * Upload one or more files via the proven monolith multipart endpoint
 * (POST /v1/file_service/upload). The monolith handles S3 upload, text
 * extraction, and Milvus embedding internally.
 *
 * After upload, best-effort triggers pgvector embedding via the Agent
 * Engine for each successfully uploaded file (so future RAG queries can
 * also retrieve from pgvector). Vectorization failures do not break the
 * upload flow — the file is uploaded, scanned, and stored regardless.
 */
export function useDocumentUploadMulti() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["documents", "upload-multi"],
    mutationFn: async (args: {
      files: File[];
      onProgress?: (pct: number) => void;
    }): Promise<DocumentOut[]> => {
      // Step 1: Multipart upload to monolith /v1/file_service/upload.
      // This is the proven path that worked before the RAG refactor —
      // the monolith handles S3 storage, virus scan, text extraction,
      // and pushes embeddings to its Milvus vector store.
      const resp = (await uploadDocuments(args.files, args.onProgress)) as
        | {
            uploaded_files?: Array<{
              file_id?: string;
              filename?: string;
              file_type?: string;
              file_key?: string;
            }>;
          }
        | undefined;

      const uploaded = resp?.uploaded_files ?? [];

      // Map monolith response to DocumentOut shape used by callers.
      const results: DocumentOut[] = uploaded.map((u) => ({
        id: String(u.file_id ?? ""),
        user_id: "",
        company_id: null,
        filename: u.filename ?? "",
        content_type: u.file_type ?? "",
        file_size: 0,
        status: "ready",
        status_detail: null,
        page_count: null,
        chunk_count: 0,
        doc_kind: u.file_type ?? "doc",
        tags: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Step 2: Best-effort pgvector embedding via Agent Engine.
      // This gives the new RAG pipeline access to the same documents.
      // Any failure (Agent Engine down, doc-id format mismatch, etc.)
      // is swallowed — the file is already safely uploaded.
      for (const doc of results) {
        if (!doc.id) continue;
        try {
          await vectorizeDocument({
            document_id: doc.id,
            user_id: doc.user_id,
            filename: doc.filename,
            file_type: doc.content_type,
          });
        } catch {
          console.warn(
            `[useDocumentUploadMulti] Vectorization failed for ${doc.filename} (file uploaded successfully)`,
          );
        }
      }

      return results;
    },
    onSuccess: (_docs, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
      logAuditEvent({
        action: "document_uploaded",
        actor_email: "user",
        target_type: "document",
        extra_data: { count: variables.files.length },
      });
    },
  });
}

