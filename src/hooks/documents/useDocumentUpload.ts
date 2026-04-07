import { useMutation, useQueryClient } from "@tanstack/react-query";
import { initiateUpload, uploadToS3, triggerProcessing } from "@/services/documents/documentService";
import type { DocumentOut } from "@/services/documents/documentService";

/**
 * Presigned-URL upload flow:
 * 1. POST /v1/documents/upload → get presigned S3 URL
 * 2. Upload file directly to S3
 * 3. POST /v1/documents/{id}/process → trigger extraction + chunking
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

      // Step 3: Trigger processing
      return triggerProcessing(presigned.document_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
    },
  });
}
