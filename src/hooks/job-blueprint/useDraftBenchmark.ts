import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { draftService } from '@/services/job-blueprint'
import type { DraftBenchmarkRequest, DraftBenchmarkResponse } from '@/types/job-blueprint'

/**
 * Draft a full 22-dimension benchmark for a role from a title + context
 * (POST /v1/agents/blueprint/draft-benchmark, Agent Engine). No success toast —
 * the drafted benchmark lands in the review step and only failures surface a
 * toast (mirrors the KCE generate hook).
 */
export function useDraftBenchmark() {
  return useMutation<DraftBenchmarkResponse, Error, DraftBenchmarkRequest>({
    mutationFn: async (body) => {
      const res = await draftService.draftBenchmark(body)
      // The draft-benchmark endpoint returns a FLAT object (no {status,data}
      // envelope) — see agent-engine app/routes/blueprint_draft.py.
      const data = res.data
      if (!data || !data.behaviors) throw new Error('No blueprint returned from the server')
      return data
    },
    onError: () => {
      toast.error("Couldn't draft the blueprint. Please try again.")
    },
  })
}
