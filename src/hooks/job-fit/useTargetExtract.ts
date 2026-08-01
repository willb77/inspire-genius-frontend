import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { toast } from 'sonner'
import { targetsService } from '@/services/targets'
import type { TargetDraft } from '@/types/targets'

/**
 * Draft a governed target from a job description (POST /v1/targets/extract,
 * blueprint-service — Decision D7). The result is a DRAFT: advisory only, with
 * per-dimension provenance + confidence. No success toast — the draft renders in
 * place; only failures surface a toast (mirrors `useDraftBenchmark`).
 *
 * This is the Job-Fit vertical's consumer of the neutral target surface: unlike
 * `/v1/blueprint/fit/*` (which scores you against pre-published roles), this lets
 * you preview the target for ANY job description you paste in.
 */
export function useTargetExtract() {
  return useMutation<TargetDraft, AxiosError, string>({
    mutationFn: async (jdText) => {
      const res = await targetsService.extract(jdText)
      const data = res.data.data
      if (!data) throw new Error('No target draft returned from the server')
      return data
    },
    onError: (err) => {
      const status = err.response?.status
      toast.error(
        status === 400
          ? 'Paste a job description first.'
          : "Couldn't draft a target from that job description. Please try again.",
      )
    },
  })
}
