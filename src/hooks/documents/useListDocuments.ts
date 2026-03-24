import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "@/services/documents/fileService";

export function useListDocuments(page = 1, limit = 10, filters?: { date?: string; search?: string }) {
  const hasDate = !!(filters && typeof filters.date === "string" && filters.date);
  const hasSearch = !!(filters && typeof filters.search === "string" && filters.search);
  const effectiveFilters = (hasDate || hasSearch)
    ? { ...(hasDate ? { date: filters!.date } : {}), ...(hasSearch ? { search: filters!.search } : {}) }
    : undefined;
  return useQuery({
    queryKey: ["file_service", "list", page, limit, effectiveFilters?.date ?? null, effectiveFilters?.search ?? null],
    queryFn: () => listDocuments(page, limit, effectiveFilters),
    staleTime: 0, // always treat as stale so invalidation + remount trigger refetch
    refetchOnMount: true,
    placeholderData: (prev) => prev, // preserve previous page while loading next
  });
}
