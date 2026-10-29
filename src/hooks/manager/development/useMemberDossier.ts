import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getMemberDossier,
  recomputeDossier,
} from "@/services/manager/development/growthService"
import type { MemberDossier } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/**
 * The dossier job itself failed. growth-service says so with a 202 whose body
 * is `{status: "error"}`, which this hook used to read as "still computing":
 * a failed Refresh then fell back to the old dossier as if it had worked, and a
 * member with no dossier yet started a new job on every poll, forever.
 */
export class DossierJobFailedError extends Error {
  constructor(message = "Dossier generation failed. Please try again.") {
    super(message)
    this.name = "DossierJobFailedError"
  }
}

/**
 * Per-member synthesized dossier.
 *
 * The compute is async (~60s, past the API Gateway 30s cap): the backend
 * returns HTTP 202 while the agent-engine job runs, and 200 with the dossier
 * once ready. We model "computing" as `null` and poll every 3s until the
 * dossier arrives. Any plan mutation should invalidate
 * `developmentKeys.dossier(memberId)`.
 */
export function useMemberDossier(memberId: string | undefined) {
  return useQuery<MemberDossier | null>({
    queryKey: developmentKeys.dossier(memberId ?? ""),
    queryFn: async () => {
      const r = await getMemberDossier(memberId as string)
      if (r.status === 202) {
        const body = r.data as unknown as { status?: string; message?: string } | undefined
        if (body?.status === "error") throw new DossierJobFailedError(body.message || undefined)
        return null // computing — keep polling
      }
      const data = r.data?.data
      if (!data) throw new Error("Dossier not found")
      return data
    },
    enabled: Boolean(memberId),
    // A failed job is an answer, not a blip: retrying would start another job.
    retry: (count, err) => !(err instanceof DossierJobFailedError) && count < 2,
    // Poll while the dossier is still computing (data === null); stop once ready
    // or once the job has failed.
    refetchInterval: (query) =>
      query.state.status !== "error" && query.state.data === null ? 3000 : false,
    staleTime: 60_000,
  })
}

/**
 * Force a fresh dossier recompute (Aura/Summit/James re-synthesis). Kicks off an
 * async agent-engine job (202) and flips the cached dossier to `null` so
 * `useMemberDossier` resumes polling until the new snapshot is ready.
 */
export function useRefreshDossier(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<void, Error, void>({
    // Opted into the global error net (`lib/mutationErrorToast.ts`): this hook
    // has no `onError`, and its caller fires it without awaiting, so a failure
    // has no other voice. A recompute that never reached the backend
    // spun the Refresh button and said nothing, which read as success.
    meta: { surfaceError: true },

    mutationFn: async () => {
      await recomputeDossier(memberId as string)
    },
    onSuccess: () => {
      if (!memberId) return
      // null -> "computing" -> the query's refetchInterval polls to completion.
      qc.setQueryData(developmentKeys.dossier(memberId), null)
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
