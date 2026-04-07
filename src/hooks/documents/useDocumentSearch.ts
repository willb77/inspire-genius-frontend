import { useMutation } from "@tanstack/react-query";
import { searchDocuments } from "@/services/documents/documentService";
import type { SearchRequest, SearchResponse } from "@/services/documents/documentService";

export function useDocumentSearch() {
  return useMutation({
    mutationKey: ["documents", "search"],
    mutationFn: (req: SearchRequest): Promise<SearchResponse> => searchDocuments(req),
  });
}
