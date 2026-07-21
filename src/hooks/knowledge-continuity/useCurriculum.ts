import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getCurriculum } from "@/services/knowledge-continuity/continuity.service"
import type { CurriculumDetail } from "@/types/knowledge-continuity"

/** Query key for a single curriculum's full detail. */
export const curriculumKey = (templateId?: string | null) =>
  ["knowledge-continuity", "curriculum", templateId ?? ""] as const

/**
 * A single curriculum with its modules + `units_by_id` provenance map
 * (GET /v1/trainer/continuity/curricula/{templateId}). Only fires when a
 * template id is selected.
 */
export function useCurriculum(
  templateId?: string | null,
  options?: Partial<UseQueryOptions<CurriculumDetail | undefined, AxiosError>>
) {
  return useQuery<CurriculumDetail | undefined, AxiosError>({
    queryKey: curriculumKey(templateId),
    queryFn: async () => {
      const res = await getCurriculum(templateId as string)
      return res.data
    },
    enabled: !!templateId,
    ...options,
  })
}
