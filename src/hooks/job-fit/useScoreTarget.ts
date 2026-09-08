import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { toast } from 'sonner'
import { fitService } from '@/services/job-fit/fit.service'
import type { FitDetail, FitMethod } from '@/types/job-fit'
import { targetDraftToBenchmarks, type TargetDraft } from '@/types/targets'

export type ScoreTargetInput = {
  draft: TargetDraft
  roleTitle?: string
  method?: FitMethod
}

/** True when the failure means "this account has no PRISM assessment on file". */
export function isNoPrismError(err: AxiosError | null | undefined): boolean {
  return err?.response?.status === 404
}

/**
 * Score the user's own PRISM against a drafted target
 * (POST /v1/blueprint/fit/target). The draft comes from `useTargetExtract`;
 * the user's vector is loaded server-side, so the body carries the target only.
 *
 * A 404 is a state, not a failure: the account has no PRISM assessment, and the
 * page renders that in place. Every other error surfaces a toast, mirroring
 * `useTargetExtract`. No success toast — the breakdown renders in place.
 */
export function useScoreTarget() {
  return useMutation<FitDetail, AxiosError, ScoreTargetInput>({
    mutationFn: async ({ draft, roleTitle, method }) => {
      const res = await fitService.scoreTarget({
        target: targetDraftToBenchmarks(draft),
        ...(method && method !== 'gap' ? { method } : {}),
        ...(roleTitle ? { roleTitle } : {}),
      })
      const data = res.data.data
      if (!data) throw new Error('No fit breakdown returned from the server')
      return data
    },
    onError: (err) => {
      if (isNoPrismError(err)) return
      toast.error("Couldn't score your fit against this target. Please try again.")
    },
  })
}
