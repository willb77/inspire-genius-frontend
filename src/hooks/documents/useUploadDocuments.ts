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
      logAuditEvent({ action: "document_uploaded", actor_email: "user", target_type: "document", extra_data: { count: variables.files.length } });
    },
  });
}
