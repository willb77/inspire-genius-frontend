import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { publishCurriculum } from "@/services/knowledge-continuity/continuity.service"
import type {
  PublishCurriculumRequest,
  PublishCurriculumResult,
} from "@/types/knowledge-continuity"

/**
 * Publish a built curriculum (POST /continuity/curricula). The backend
 * re-enforces the citation gate (422 if any item lacks a validated/provisional
 * citation). On success the curricula list is invalidated.
 */
export function usePublishCurriculum() {
  const qc = useQueryClient()
  return useMutation<PublishCurriculumResult, AxiosError, PublishCurriculumRequest>({
    mutationFn: async (body) => {
      const res = await publishCurriculum(body)
      if (!res.data) throw new Error("No publish response from the server")
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge-continuity", "curricula"] })
      toast.success("Curriculum published")
    },
    onError: () => {
      toast.error("Couldn't publish the curriculum. Please try again.")
    },
  })
}
