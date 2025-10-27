import { useMutation } from "@tanstack/react-query";
import { getDocumentDownloadLink } from "@/services/documents/fileService";

export function useDownloadDocument() {
  return useMutation({
    mutationKey: ["file_service", "download"],
    mutationFn: async (fileId: string) => {
      return getDocumentDownloadLink(fileId);
    },
  });
}
