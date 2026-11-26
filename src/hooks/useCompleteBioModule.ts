import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { completeBioModule, reopenBioModule } from "@/services/bio/bioService"
import { bioKeys } from "@/hooks/useBioNarrative"
import type { BioModuleStatusResponse } from "@/types/bio"

export type BioModuleStatusVars = { memberId: string; moduleType: string }

/**
 * Mark a Bio Capture chapter done ("covered"), member-driven.
 *
 * On success the member's narrative is invalidated, so the chapters strip shows
 * "Captured" and `nextSuggestedModule` moves on. Errors (403 not the owner,
 * 422 unknown chapter, network) are left on the mutation for the caller to
 * render — a control that fails silently reads as one that worked.
 */
export function useCompleteBioModule() {
  const qc = useQueryClient()
  return useMutation<BioModuleStatusResponse, AxiosError, BioModuleStatusVars>({
    mutationFn: ({ memberId, moduleType }) =>
      completeBioModule(memberId, moduleType),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: bioKeys.narrative(vars.memberId) })
    },
  })
}

/**
 * Reopen a chapter the member had marked done (back to "in_progress"). Same
 * invalidation and error contract as {@link useCompleteBioModule}.
 */
export function useReopenBioModule() {
  const qc = useQueryClient()
  return useMutation<BioModuleStatusResponse, AxiosError, BioModuleStatusVars>({
    mutationFn: ({ memberId, moduleType }) => reopenBioModule(memberId, moduleType),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: bioKeys.narrative(vars.memberId) })
    },
  })
}
