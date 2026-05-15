import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadDocuments } from "@/services/documents/fileService";
import { logAuditEvent } from "@/services/audit/audit.service";

export function useUploadDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["file_service", "upload"],
    mutationFn: async (args: { files: File[]; onProgress?: (p: number) => void }) => {
      return uploadDocuments(args.files, args.onProgress);
    },
    onSuccess: (_resp, variables) => {
      // Invalidate the documents list so it refetches with the new uploads
      queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
      logAuditEvent({ action: "document_uploaded", actor_email: "user", target_type: "document", extra_data: { count: variables.files.length } });
    },
  });
}
