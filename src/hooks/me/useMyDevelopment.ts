/**
 * My development — the self-scoped reads and writes behind `/my/development`.
 *
 * The member's own view of the rows a coach sees about them in the Team
 * Development Studio. Every query here calls a `/v1/growth/me/*` route, so no
 * member id is passed anywhere: growth-service resolves it from the verified
 * JWT `sub`. That is why these hooks take no arguments and why there is no
 * `enabled: Boolean(memberId)` guard — there is no id to wait for.
 *
 * **Query keys are deliberately NOT `developmentKeys.*`.** Those are keyed by
 * member id and are invalidated by the coach-side mutations; sharing a key
 * would make a manager's write clear this surface's cache (and vice versa) for
 * a *different* scope. The two caches answer different questions and must not
 * collide.
 *
 * **Nothing here swallows a failure into an empty list.** `?? []` appears only
 * where the server genuinely returned a 2xx with no `data`, which is an empty
 * collection; a rejected request rejects the query, so `isError` stays
 * distinguishable from "you have nothing yet". For a new member the honest
 * answer to most of these IS nothing, so an error that fell through to `[]`
 * would be indistinguishable from the correct answer.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  closeMyGap,
  createMyGap,
  createMyLearningItem,
  getMyFullPrism,
  getMyGaps,
  getMyLearningItems,
  getMyMilestones,
  updateMyLearningItem,
  type CreateGapInput,
  type CreateLearningItemInput,
  type UpdateLearningItemInput,
} from "@/services/manager/development/growthService"
import type {
  DevelopmentGap,
  FullPrismProfileResponse,
  LearningItem,
  Milestone,
} from "@/types/development"

/** Cache keys for the self-scoped growth reads. Own namespace — see above. */
export const myDevelopmentKeys = {
  all: ["me", "development"] as const,
  /** Prefix over every target-blueprint variant, so closing a gap reaches all. */
  gapsFor: () => [...myDevelopmentKeys.all, "gaps"] as const,
  gaps: (targetBlueprintId?: string) =>
    [...myDevelopmentKeys.gapsFor(), targetBlueprintId ?? "default"] as const,
  learning: () => [...myDevelopmentKeys.all, "learning"] as const,
  milestones: () => [...myDevelopmentKeys.all, "milestones"] as const,
  /** Every PRISM scale on file for the caller — not the 8-behaviour radar,
   *  which is `["me","prism"]` (useMyPrism). Two reads, two shapes. */
  fullPrism: () => [...myDevelopmentKeys.all, "full-prism"] as const,
}

/** GET /me/gaps — the person's own development gaps, open and closed. */
export function useMyGaps(targetBlueprintId?: string) {
  return useQuery<DevelopmentGap[], AxiosError>({
    queryKey: myDevelopmentKeys.gaps(targetBlueprintId),
    queryFn: async () => {
      const r = await getMyGaps(targetBlueprintId)
      return r.data?.data ?? []
    },
    staleTime: 60_000,
  })
}

/** GET /me/learning-items — the person's own learning plan. */
export function useMyLearningItems() {
  return useQuery<LearningItem[], AxiosError>({
    queryKey: myDevelopmentKeys.learning(),
    queryFn: async () => {
      const r = await getMyLearningItems()
      return r.data?.data ?? []
    },
    staleTime: 60_000,
  })
}

/** GET /me/milestones — the person's own roadmap. Read-only: there is no
 *  self-scoped write for milestones, so this surface offers none. */
export function useMyMilestones() {
  return useQuery<Milestone[], AxiosError>({
    queryKey: myDevelopmentKeys.milestones(),
    queryFn: async () => {
      const r = await getMyMilestones()
      return r.data?.data ?? []
    },
    staleTime: 60_000,
  })
}

/**
 * GET /me/profile — every PRISM scale on file for the caller.
 *
 * `null` means the server answered with no profile, which is an ordinary state
 * (no assessment on file yet) and NOT an error. A CONFLICTED profile is not
 * that case: it returns a body with `isConflicted` set, so the surface can say
 * why it is refusing instead of presenting the person as having no data.
 */
export function useMyFullPrism() {
  return useQuery<FullPrismProfileResponse | null, AxiosError>({
    queryKey: myDevelopmentKeys.fullPrism(),
    queryFn: async () => {
      const r = await getMyFullPrism()
      return r.data?.data ?? null
    },
    staleTime: 60_000,
  })
}

function useInvalidateGaps() {
  const qc = useQueryClient()
  // The prefix, not one variant: `gaps()` appends the target id, so
  // invalidating only the "default" variant leaves a closed gap showing as
  // open for anyone who had a target selected.
  return () => qc.invalidateQueries({ queryKey: myDevelopmentKeys.gapsFor() })
}

/**
 * POST /me/gaps — "I need to get better at X", in the person's own words.
 *
 * No `meta.surfaceError`: every caller awaits this and renders the failure
 * itself, and the global toast net would then say it twice.
 */
export function useCreateMyGap() {
  const invalidate = useInvalidateGaps()
  return useMutation<DevelopmentGap, AxiosError, CreateGapInput>({
    mutationFn: async (input) => {
      const r = await createMyGap(input)
      const data = r.data?.data
      if (!data) throw new Error("That gap was not added.")
      return data
    },
    onSuccess: () => invalidate(),
  })
}

/** POST /me/gaps/{id}/close — the person closes their own gap. */
export function useCloseMyGap() {
  const invalidate = useInvalidateGaps()
  return useMutation<DevelopmentGap, AxiosError, string>({
    mutationFn: async (gapId) => {
      const r = await closeMyGap(gapId)
      const data = r.data?.data
      if (!data) throw new Error("That gap was not closed.")
      return data
    },
    onSuccess: () => invalidate(),
  })
}

/** POST /me/learning-items — the person adds something they are working through. */
export function useCreateMyLearningItem() {
  const qc = useQueryClient()
  return useMutation<LearningItem, AxiosError, CreateLearningItemInput>({
    mutationFn: async (input) => {
      const r = await createMyLearningItem(input)
      const data = r.data?.data
      if (!data) throw new Error("That learning item was not added.")
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: myDevelopmentKeys.learning() }),
  })
}

/**
 * PATCH /me/learning-items/{id} — the person records their own progress.
 *
 * Only the fields passed are sent and the server writes only what it receives,
 * so saving `progress` does not blank `quizScore`.
 */
export function useUpdateMyLearningItem() {
  const qc = useQueryClient()
  return useMutation<
    LearningItem,
    AxiosError,
    { itemId: string; input: UpdateLearningItemInput }
  >({
    mutationFn: async ({ itemId, input }) => {
      const r = await updateMyLearningItem(itemId, input)
      const data = r.data?.data
      if (!data) throw new Error("That progress was not saved.")
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: myDevelopmentKeys.learning() }),
  })
}
