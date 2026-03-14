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
      logAuditEvent({ event_type: "document_deleted", actor: "user", resource: "document", details: { file_id: fileId } });
    },
  });
}
