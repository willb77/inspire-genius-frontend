/**
 * "Close this gap" — the whole thing, in one mutation (TDS-4a).
 *
 * ## What was wrong
 *
 * The button said "Close this gap" and never called the close route. It fired a
 * learning-item create and a milestone create, both without awaiting, and left
 * the gap open. Nothing on screen said so: the gap simply stayed in the list,
 * which reads as "I must not have clicked it".
 *
 * ## Why all three calls live in ONE mutation
 *
 * Two reasons, and the second is the important one.
 *
 * 1. **Sequencing.** The three calls are ordered on purpose (below) and that
 *    order has to be enforced somewhere. A component firing three independent
 *    mutations cannot.
 * 2. **One voice on failure.** `useLearningPlan` and `useCreateMilestone` are
 *    opted into the global error net (`lib/mutationErrorToast.ts`), which fires
 *    on any rejection they don't handle themselves. Awaiting them from a panel
 *    that also toasts would show the user two messages for one failure — and
 *    "that didn't save" twice does not read as thoroughness. Calling the
 *    services directly from one mutationFn gives the failure exactly one
 *    sentence, and that sentence can say what DID happen.
 *
 * ## The order: seed first, close last
 *
 * Closing first and failing afterwards would leave a gap marked closed with no
 * learning item and no milestone behind it — a plan that silently lost the
 * follow-up, and nothing left in the list to notice it by. Seeding first and
 * failing afterwards leaves the gap open, which is exactly what the surface
 * already shows; the manager can retry, and the closed gap disappearing from
 * the open set is the visible proof that the whole sequence ran.
 *
 * Every rejection therefore names what was written and what was not. A partial
 * success reported as success is the defect this package exists to remove; it
 * must not come back one step further along.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  closeGap,
  createLearningItem,
  createMilestone,
} from "@/services/manager/development/growthService"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import type { DevelopmentGap, LearningItem, Milestone } from "@/types/development"
import { developmentKeys } from "./queryKeys"

export type CloseGapPlanResult = {
  /** The gap as the SERVER returned it — status "closed". */
  gap: DevelopmentGap
  item: LearningItem
  milestone?: Milestone
}

/** Server sentence appended to our own, when there is one worth reading. */
function because(err: unknown): string {
  const detail = apiErrorMessage(err, "")
  return detail.trim() ? ` ${detail.trim()}` : ""
}

export function useCloseGapPlan(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<CloseGapPlanResult, Error, { gap: DevelopmentGap }>({
    mutationFn: async ({ gap }) => {
      const id = memberId as string

      let item: LearningItem
      try {
        const r = await createLearningItem(id, {
          gapId: gap.gapId,
          goalId: gap.goalId,
          title: `Close gap: ${gap.competency}`,
        })
        const data = r.data?.data
        if (!data) throw new Error("")
        item = data
      } catch (err) {
        throw new Error(
          `The learning item couldn't be created, so the gap was left open.${because(err)}`,
        )
      }

      let milestone: Milestone | undefined
      if (gap.goalId) {
        try {
          const r = await createMilestone(id, {
            goalId: gap.goalId,
            title: `Close ${gap.competency} gap`,
            horizon: "d90",
            gapIds: [gap.gapId],
          })
          const data = r.data?.data
          if (!data) throw new Error("")
          milestone = data
        } catch (err) {
          throw new Error(
            `The learning item was created, but the milestone wasn't — the gap was left open.${because(err)}`,
          )
        }
      }

      try {
        const r = await closeGap(id, gap.gapId)
        const data = r.data?.data
        if (!data) throw new Error("")
        return { gap: data, item, milestone }
      } catch (err) {
        const seeded = milestone ? "learning item and milestone were" : "learning item was"
        throw new Error(
          `The ${seeded} created, but the gap could not be closed — it is still open.${because(err)}`,
        )
      }
    },
    onSuccess: ({ gap }) => {
      if (!memberId) return
      // Reflect the gap the SERVER returned straight away, across every
      // target-blueprint variant, so the row stops offering to close what is
      // already closed before the refetch lands.
      qc.setQueriesData<DevelopmentGap[]>(
        { queryKey: developmentKeys.gapsFor(memberId) },
        (old) => (old ? old.map((g) => (g.gapId === gap.gapId ? gap : g)) : old),
      )
      qc.invalidateQueries({ queryKey: developmentKeys.gapsFor(memberId) })
      qc.invalidateQueries({ queryKey: developmentKeys.milestones(memberId) })
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
