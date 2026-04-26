import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
  vectorizeDocument,
} from "@/services/documents/documentService";
import type { DocumentOut } from "@/services/documents/documentService";
import { logAuditEvent } from "@/services/audit/audit.service";

/**
 * Full RAG-enabled upload flow:
 * 1. POST /v1/documents/upload → get presigned S3 URL + document_id
 * 2. Upload file directly to S3 (XHR with progress)
 * 3. POST /v1/documents/{id}/process → scan, extract text, chunk
 * 4. POST /v1/agents/documents/vectorize → generate pgvector embeddings
 *
 * After step 4 the document is searchable by all AI agents via RAG.
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
      // Step 1: Get presigned URL
      const presigned = await initiateUpload({
        filename: args.file.name,
        content_type: args.file.type || "application/octet-stream",
        file_size: args.file.size,
        doc_kind: args.docKind,
        company_id: args.companyId,
        tags: args.tags,
      });

      // Step 2: Upload to S3
      await uploadToS3(presigned.upload_url, presigned.upload_fields, args.file, args.onProgress);

      // Step 3: Trigger processing (scan → extract text → chunk)
      const doc = await triggerProcessing(presigned.document_id);

      // Step 4: Trigger pgvector embedding via Agent Engine (best-effort)
      // If the Agent Engine is unreachable the document is still uploaded and
      // processed — it just won't be in the vector store until re-vectorized.
      try {
        await vectorizeDocument({
          document_id: doc.id,
          user_id: doc.user_id,
          filename: doc.filename,
          file_type: doc.content_type,
        });
      } catch (err) {
        console.warn("[useDocumentUpload] Vectorization failed (document still uploaded):", err);
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

/**
 * Upload multiple files sequentially through the full RAG pipeline.
 * Each file goes through: presigned URL → S3 → process → vectorize.
 */
export function useDocumentUploadMulti() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["documents", "upload-multi"],
    mutationFn: async (args: {
      files: File[];
      onProgress?: (pct: number) => void;
    }): Promise<DocumentOut[]> => {
      const results: DocumentOut[] = [];

      for (let i = 0; i < args.files.length; i++) {
        const file = args.files[i];

        // Per-file progress scaled to overall progress
        const fileProgress = (pct: number) => {
          if (!args.onProgress) return;
          const base = (i / args.files.length) * 100;
          const slice = (1 / args.files.length) * 100;
          args.onProgress(Math.floor(base + (pct / 100) * slice));
        };

        // Step 1: Presigned URL
        const presigned = await initiateUpload({
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          file_size: file.size,
        });

        // Step 2: S3 upload
        await uploadToS3(presigned.upload_url, presigned.upload_fields, file, fileProgress);

        // Step 3: Process
        const doc = await triggerProcessing(presigned.document_id);

        // Step 4: Vectorize (best-effort)
        try {
          await vectorizeDocument({
            document_id: doc.id,
            user_id: doc.user_id,
            filename: doc.filename,
            file_type: doc.content_type,
          });
        } catch {
          console.warn(`[useDocumentUploadMulti] Vectorization failed for ${file.name}`);
        }

        results.push(doc);
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
