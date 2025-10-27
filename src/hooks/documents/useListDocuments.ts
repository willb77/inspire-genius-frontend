import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "@/services/documents/fileService";

export function useListDocuments(page = 1, limit = 10) {
  return useQuery({
    queryKey: ["file_service", "list", page, limit],
    queryFn: () => listDocuments(page, limit),
    staleTime: 60_000,
    placeholderData: (prev) => prev, // preserve previous page while loading next
  });
}
