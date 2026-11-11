import { useQuery } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import type { LocalListing, LocalQuery } from "@/lib/career-discovery/learningSection"
import { getLearningLocal } from "@/services/career-discovery/learningLocal.service"

/** JF-10: one local listing, fetched only once an occupation, kind and state are chosen. */
export function useLearningLocal(query: LocalQuery | null) {
  return useQuery<LocalListing | undefined, AxiosError>({
    queryKey: ["career-discovery", "learning-local", query?.soc ?? null, query?.kind ?? null, query?.state ?? null],
    queryFn: async () => (await getLearningLocal(query as LocalQuery)).data,
    enabled: query !== null,
    retry: false,
    staleTime: 60 * 60 * 1000,
  })
}
