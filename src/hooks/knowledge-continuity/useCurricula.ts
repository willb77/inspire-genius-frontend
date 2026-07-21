import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getCurricula } from "@/services/knowledge-continuity/continuity.service"
import type { CurriculumSummary } from "@/types/knowledge-continuity"

/** Query key for the published-curricula list, optionally scoped to a taxonomy. */
export const curriculaKey = (taxonomyId?: string) =>
  ["knowledge-continuity", "curricula", taxonomyId ?? "all"] as const

/** Published successor curricula (GET /v1/trainer/continuity/curricula). */
export function useCurricula(
  taxonomyId?: string,
  options?: Partial<UseQueryOptions<CurriculumSummary[], AxiosError>>
) {
  return useQuery<CurriculumSummary[], AxiosError>({
    queryKey: curriculaKey(taxonomyId),
    queryFn: async () => {
      const res = await getCurricula(taxonomyId)
      return res.data ?? []
    },
    ...options,
  })
}
