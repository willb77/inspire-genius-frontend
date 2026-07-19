import { useMutation } from "@tanstack/react-query"
import { sendHonorEvaluation, type HonorEvalReply } from "@/services/honor/honorChat"
import { evaluateFellow } from "@/services/honor/coach.service"
import type { HonorEvaluateBody, HonorEvaluation } from "@/types/honor"

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
