import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createLearningItem,
  type CreateLearningItemInput,
} from "@/services/manager/development/growthService"
import type { LearningItem } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/**
 * Seed a learning item (typically from a gap or goal). Invalidates the
 * member's dossier so the Learning tab and roadmap reflect it.
 */
export function useLearningPlan(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<LearningItem, Error, CreateLearningItemInput>({
    mutationFn: async (input) => {
      const r = await createLearningItem(memberId as string, input)
      const data = r.data?.data
      if (!data) throw new Error("Create learning item failed")
      return data
    },
    onSuccess: () => {
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
