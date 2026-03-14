import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteDocuments } from "@/services/documents/fileService";
import { logAuditEvent } from "@/services/audit/audit.service";

export function useBulkDeleteDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      if (!Array.isArray(fileIds) || fileIds.length === 0) return;
      await bulkDeleteDocuments(fileIds);
    },
    onSuccess: (_resp, fileIds) => {
      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
      logAuditEvent({ event_type: "document_deleted", actor: "user", resource: "document", details: { count: fileIds.length, file_ids: fileIds } });
    },
  });
}
