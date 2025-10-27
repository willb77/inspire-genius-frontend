import { useMutation } from "@tanstack/react-query";
import { uploadDocuments } from "@/services/documents/fileService";

export function useUploadDocuments() {
  return useMutation({
    mutationKey: ["file_service", "upload"],
    mutationFn: async (args: { files: File[]; onProgress?: (p: number) => void }) => {
      return uploadDocuments(args.files, args.onProgress);
    },
  });
}
