/**
 * Document upload hooks — B.2 flow (2026-05-13).
 *
 * Both `useDocumentUpload` (single file) and `useDocumentUploadMulti`
 * (batch) route through the document-service presigned-URL → S3 →
 * triggerProcessing pipeline. `triggerProcessing` handles scan / extract
 * / chunk / embed into Aurora pgvector — no separate vectorize call
 * needed (the previous fire-and-forget agent-engine vectorize hack was
 * required only while the monolith was the upload sink).
 *
 * Per the 2026-05-10 pgvector consolidation, this is the canonical
 * upload path. The legacy monolith /v1/file_service/upload route is
 * being retired with the monolith Alex agent.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
} from "@/services/documents/documentService";
import type { DocumentOut } from "@/services/documents/documentService";
import { logAuditEvent } from "@/services/audit/audit.service";

async function uploadOne(args: {
  file: File;
  docKind?: string;
  companyId?: string;
  tags?: string[];
  shared?: boolean;
  onProgress?: (pct: number) => void;
}): Promise<DocumentOut> {
  const presigned = await initiateUpload({
    filename: args.file.name,
    content_type: args.file.type || "application/octet-stream",
    file_size: args.file.size,
    doc_kind: args.docKind,
    company_id: args.companyId,
    tags: args.tags,
    shared: args.shared,
  });

  await uploadToS3(
    presigned.upload_url,
    presigned.upload_fields,
    args.file,
    args.onProgress,
  );

  // triggerProcessing kicks off the pipeline. Document-service handles
  // scan + extract + chunk + embed into pgvector. Returns the canonical
  // DocumentOut once the row is in the documents table.
  return triggerProcessing(presigned.document_id);
}

/** Single-file upload via the B.2 presigned-URL flow. */
export function useDocumentUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["documents", "upload"],
    mutationFn: (args: {
      file: File;
      docKind?: string;
      companyId?: string;
      tags?: string[];
      shared?: boolean;
      onProgress?: (pct: number) => void;
    }): Promise<DocumentOut> => uploadOne(args),
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

/** Batch upload via the B.2 presigned-URL flow (one file at a time
 *  inside the mutation for backpressure + accurate progress reporting). */
export function useDocumentUploadMulti() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["documents", "upload-multi"],
    mutationFn: async (args: {
      files: File[];
      onProgress?: (pct: number) => void;
    }): Promise<DocumentOut[]> => {
      const total = args.files.length;
      const results: DocumentOut[] = [];

      for (let i = 0; i < args.files.length; i++) {
        const file = args.files[i];
        const doc = await uploadOne({
          file,
          onProgress: (pct) => {
            if (!args.onProgress) return;
            // Proportional progress across the batch.
            const overall = Math.floor(((i * 100 + pct) / (total * 100)) * 100);
            args.onProgress(Math.min(100, overall));
          },
        });
        results.push(doc);
        args.onProgress?.(Math.floor(((i + 1) / total) * 100));
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
