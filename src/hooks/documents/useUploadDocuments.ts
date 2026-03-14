import { useMutation } from "@tanstack/react-query";
import { uploadDocuments } from "@/services/documents/fileService";
import { logAuditEvent } from "@/services/audit/audit.service";

export function useUploadDocuments() {
  return useMutation({
    mutationKey: ["file_service", "upload"],
    mutationFn: async (args: { files: File[]; onProgress?: (p: number) => void }) => {
      return uploadDocuments(args.files, args.onProgress);
    },
    onSuccess: (_resp, variables) => {
      logAuditEvent({ event_type: "document_uploaded", actor: "user", resource: "document", details: { count: variables.files.length } });
    },
  });
}
