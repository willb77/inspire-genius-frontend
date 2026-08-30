import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getMemberDossier,
  recomputeDossier,
} from "@/services/manager/development/growthService"
import type { MemberDossier } from "@/types/development"
import { developmentKeys } from "./queryKeys"

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
      if (r.status === 202) return null // computing — keep polling
      const data = r.data?.data
      if (!data) throw new Error("Dossier not found")
      return data
    },
    enabled: Boolean(memberId),
    // Poll while the dossier is still computing (data === null); stop once ready.
    refetchInterval: (query) => (query.state.data === null ? 3000 : false),
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
