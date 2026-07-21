import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { sendHonorEvaluation, type HonorEvalReply } from "@/services/honor/honorChat"
import { evaluateFellow, getFellowSources } from "@/services/honor/coach.service"
import type { HonorEvaluateBody, HonorEvaluation, HonorFellowSources } from "@/types/honor"

/**
 * Live member-evaluation mutation — reuses the Meridian async-jobs transport
 * (the Summit pattern) via {@link sendHonorEvaluation}. Used for the optional
 * "Narrate with Meridian" prose step; on any error the caller falls back to the
 * seeded canned answers so the surface never breaks (see HonorEvaluate).
 */
export function useHonorEvaluate() {
  return useMutation<HonorEvalReply, Error, { prompt: string; memberId?: string }>({
    mutationFn: ({ prompt, memberId }) => sendHonorEvaluation(prompt, { memberId }),
  })
}

/**
 * Deterministic evaluation mutation — POST …/{fellow_id}/evaluate (Phase 2).
 * Returns the fully-scored, source-tagged backbone the surface renders. The
 * FELLOW is the subject (ownership-gated server-side); comparative `memberIds`
 * are ownership-gated too. Zero model calls in the score path.
 */
export function useHonorEvaluateReport() {
  return useMutation<
    HonorEvaluation | undefined,
    Error,
    { fellowId: string; body?: HonorEvaluateBody }
  >({
    mutationFn: async ({ fellowId, body }) => {
      const res = await evaluateFellow(fellowId, body)
      return res.data
    },
  })
}

/**
 * The sources a fellow has submitted — GET …/{fellowId}/sources. Drives the
 * per-fellow "documents on file" badges + the source-selection checkboxes.
 * Read-safe: fetched only when a fellow is selected.
 */
export function useFellowSources(
  fellowId: string | undefined,
  options?: Partial<UseQueryOptions<HonorFellowSources | undefined, Error>>,
) {
  return useQuery<HonorFellowSources | undefined, Error>({
    queryKey: ["honor", "fellow-sources", fellowId ?? "none"],
    queryFn: async () => {
      if (!fellowId) return undefined
      const res = await getFellowSources(fellowId)
      return res.data
    },
    enabled: !!fellowId,
    retry: false,
    ...options,
  })
}
