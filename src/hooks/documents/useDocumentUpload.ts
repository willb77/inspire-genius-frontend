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
      // FIRE-AND-FORGET — do NOT await. The agent-engine vectorize endpoint
      // can take 30+ seconds (it opens its own asyncpg connection through
      // RDS Proxy with SSL) and blocking the upload mutation makes the
      // Documents page modal hang on its progress animation. Vectorization
      // success/failure does not affect upload success in any way; the
      // monolith already stored the file in Milvus during /file_service/upload.
      if (doc.id) {
        void vectorizeDocument({
          document_id: doc.id,
          user_id: doc.user_id,
          filename: doc.filename,
          file_type: doc.content_type,
          file_id: doc.id, // also pass as monolith file_id alias
          // 2026-05-09 fix: pass the S3 key so agent-engine can fetch
          // the file body, extract text, and populate Aurora documents.
          // Without this the vectorize endpoint silently returns
          // "skipped" because the doc isn't in Aurora yet.
          file_key: uploaded?.file_key,
        }).catch((err) => {
          console.warn(
            "[useDocumentUpload] Background vectorization failed (file uploaded successfully):",
            err,
          );
        });
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
      // FIRE-AND-FORGET — do NOT await. The agent-engine vectorize endpoint
      // can take 30+ seconds per file (asyncpg + RDS Proxy SSL handshake);
      // sequential awaits here would block the upload-modal progress animation
      // and make the My Documents page upload appear to hang/fail even though
      // the multipart upload above succeeded.
      //
      // Vectorization is best-effort and does not block upload completion.
      // Each call is dispatched in parallel; rejection is logged but never
      // surfaced to the user.
      for (let i = 0; i < results.length; i++) {
        const doc = results[i];
        const u = uploaded[i];
        if (!doc.id) continue;
        void vectorizeDocument({
          document_id: doc.id,
          user_id: doc.user_id,
          filename: doc.filename,
          file_type: doc.content_type,
          file_id: doc.id, // also pass as monolith file_id alias
          // 2026-05-09 fix: pass the S3 key so agent-engine can fetch
          // the file from S3, extract text, populate Aurora documents,
          // and vectorize. Without this, vectorize silently no-ops
          // because the doc isn't in Aurora yet.
          file_key: u?.file_key,
        }).catch(() => {
          console.warn(
            `[useDocumentUploadMulti] Background vectorization failed for ${doc.filename} (file uploaded successfully)`,
          );
        });
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

