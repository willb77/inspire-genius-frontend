import { useMutation } from "@tanstack/react-query"
import { generateResume } from "@/services/honor/coach.service"
import type { HonorResume, HonorResumeBody, HonorResumeDisabled } from "@/types/honor"

/** True when the route returned the server-flag-off `{ disabled }` shape. */
export function isResumeDisabled(
  data: HonorResume | HonorResumeDisabled | undefined,
): data is HonorResumeDisabled {
  return !!data && "disabled" in data && (data as HonorResumeDisabled).disabled === true
}

/**
 * Generate a Fellow's résumé draft (Phase 5). Returns either the structured
 * `HonorResume` or `{ disabled: true }` when the server `honor_resume` flag is
 * off — the caller falls back to a labeled sample so the surface + branded PDF
 * export stay demoable until the safe-translation SME sign-off activates it.
 */
export function useGenerateResume() {
  return useMutation<
    HonorResume | HonorResumeDisabled | undefined,
    Error,
    { fellowId: string; body?: HonorResumeBody }
  >({
    mutationFn: async ({ fellowId, body }) => {
      const res = await generateResume(fellowId, body)
      return res.data
    },
  })
}
