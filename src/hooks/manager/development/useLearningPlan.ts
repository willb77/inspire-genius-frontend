import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createLearningItem,
  updateLearningItem,
  type CreateLearningItemInput,
  type UpdateLearningItemInput,
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
    // Opted into the global error net (`lib/mutationErrorToast.ts`): this hook
    // has no `onError`, and its caller fires it without awaiting, so a failure
    // has no other voice. Fired by `applyStaged` without awaiting;
    // the staged action is cleared either way.
    meta: { surfaceError: true },

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

/**
 * Persist progress on one learning item (TDS-4a).
 *
 * The Learning tab rendered `<Progress value={item.progress}>` with no way to
 * change it, so the only number the manager could see was one nothing on this
 * surface could write. This is the write.
 *
 * Only the fields passed are sent, and the server writes only the fields it
 * receives — so a save that sets `progress` does not blank `quizScore`.
 *
 * No `meta.surfaceError`: the caller awaits this and renders the server's own
 * sentence, and the global net would then say it twice.
 */
export function useUpdateLearningItem(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<LearningItem, Error, { itemId: string; input: UpdateLearningItemInput }>({
    mutationFn: async ({ itemId, input }) => {
      const r = await updateLearningItem(memberId as string, itemId, input)
      const data = r.data?.data
      if (!data) throw new Error("The learning item was not updated.")
      return data
    },
    onSuccess: () => {
      if (!memberId) return
      // The learning list is part of the dossier payload, so that is what has
      // to be refetched for the row to show the number that was saved.
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
