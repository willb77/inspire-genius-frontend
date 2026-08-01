import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { buildCurriculum } from "@/services/knowledge-continuity/capture.service"
import type { BuildCurriculumRequest, BuiltCurriculum } from "@/types/knowledge-continuity"

/**
 * Ask Echo to assemble validated units into a wiring-adapted curriculum
 * (POST /v1/agents/kce/curriculum/build). Deterministic; returns modules ready
 * to publish. Nothing is persisted until `usePublishCurriculum` runs.
 */
export function useBuildCurriculum() {
  return useMutation<BuiltCurriculum, AxiosError, BuildCurriculumRequest>({
    mutationFn: async (body) => {
      const res = await buildCurriculum(body)
      if (!res.data) throw new Error("No curriculum returned from the builder")
      return res.data
    },
    onError: () => {
      toast.error("Couldn't build the curriculum. Please try again.")
    },
  })
}
