import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDocument } from "@/services/documents/fileService";
import { logAuditEvent } from "@/services/audit/audit.service";

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["file_service", "delete"],
    mutationFn: async (fileId: string) => deleteDocument(fileId),
    onSuccess: async (_resp, fileId) => {
      await queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
      logAuditEvent({ action: "document_deleted", actor_email: "user", target_type: "document", extra_data: { file_id: fileId } });
    },
  });
}
