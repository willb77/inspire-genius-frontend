import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDocument } from "@/services/documents/fileService";

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["file_service", "delete"],
    mutationFn: async (fileId: string) => deleteDocument(fileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
    },
  });
}
