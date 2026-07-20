import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getMemberDossier } from "@/services/manager/development/growthService"
import type { MemberDossier } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/**
 * Per-member synthesized dossier. Any plan mutation (goals, gaps, learning,
 * milestones) should invalidate `developmentKeys.dossier(memberId)`.
 */
export function useMemberDossier(memberId: string | undefined) {
  return useQuery<MemberDossier>({
    queryKey: developmentKeys.dossier(memberId ?? ""),
    queryFn: async () => {
      const r = await getMemberDossier(memberId as string)
      const data = r.data?.data
      if (!data) throw new Error("Dossier not found")
      return data
    },
    enabled: Boolean(memberId),
    staleTime: 60_000,
  })
}

/**
 * Force a fresh dossier recompute (Aura/Summit/James re-synthesis) and refresh
 * the cache. Optimistically invalidates the member's dossier query.
 */
export function useRefreshDossier(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<MemberDossier, Error, void>({
    mutationFn: async () => {
      const r = await getMemberDossier(memberId as string, true)
      const data = r.data?.data
      if (!data) throw new Error("Dossier not found")
      return data
    },
    onSuccess: (data) => {
      if (!memberId) return
      qc.setQueryData(developmentKeys.dossier(memberId), data)
      qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
    },
  })
}
