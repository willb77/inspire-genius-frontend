import { useMutation } from "@tanstack/react-query"
import { sendHonorEvaluation, type HonorEvalReply } from "@/services/honor/honorChat"

/**
 * Live member-evaluation mutation — reuses the Meridian async-jobs transport
 * (the Summit pattern) via {@link sendHonorEvaluation}. The Evaluate surface
 * calls this when USE_HONOR_EVAL_LIVE is on; on any error it falls back to the
 * seeded canned answers so the surface never breaks (see HonorEvaluate).
 */
export function useHonorEvaluate() {
  return useMutation<HonorEvalReply, Error, { prompt: string; memberId?: string }>({
    mutationFn: ({ prompt, memberId }) => sendHonorEvaluation(prompt, { memberId }),
  })
}
