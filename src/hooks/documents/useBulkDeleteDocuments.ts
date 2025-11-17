import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteDocuments } from "@/services/documents/fileService";

export function useBulkDeleteDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      if (!Array.isArray(fileIds) || fileIds.length === 0) return;
      await bulkDeleteDocuments(fileIds);
    },
    onSuccess: () => {
      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
    },
  });
}
