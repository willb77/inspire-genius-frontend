import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createMemberAnalysis,
  deleteMemberAnalysis,
  listMemberAnalyses,
  type AnalysisKind,
  type CreateAnalysisInput,
  type SavedAnalysis,
} from "@/services/manager/development/growthService"
import { developmentKeys } from "./queryKeys"

/**
 * Saved Team Studio analyses — one manager's kept write-ups, comparisons and
 * scenarios for one member (TDS-3).
 *
 * **Per-manager, and that is enforced on the server, not here.** The rows are
 * scoped `(manager_sub, member_id)` from the caller's own signed sub; the
 * client sends no manager identifier at all, so there is nothing in the request
 * to get wrong. Two managers coaching the same person issue byte-identical
 * requests and receive disjoint lists. Nothing on this surface may imply that
 * another coach, or the member, can read what is kept here.
 *
 * **404 is one answer, not two.** The server returns it for "no such analysis"
 * and for "not yours" identically, on purpose — the lookup is scoped rather
 * than fetched-then-compared, so a 403/404 split cannot leak the existence of
 * another manager's work. None of these hooks may render a permission message.
 *
 * None of them opts into the global error net (`lib/mutationErrorToast.ts`):
 * every one is awaited by its panel, which renders the outcome itself.
 */

/**
 * This member's saved analyses, optionally narrowed to one kind.
 *
 * ONE request per workspace, filtered client-side via `select`, rather than one
 * request per tab. The query key stays keyed on the member alone so the three
 * tabs share a cache — narrowing the key by kind would fetch the same list
 * three times and make each tab's invalidation miss the other two.
 *
 * The server's order (newest first) is preserved. Nothing re-sorts on
 * `createdAt`, which is optional in the payload: a client-side sort over a
 * possibly-absent timestamp reorders rows silently.
 */
export function useMemberAnalyses(memberId: string | undefined, kind?: AnalysisKind) {
  return useQuery<SavedAnalysis[], Error, SavedAnalysis[]>({
    queryKey: developmentKeys.analyses(memberId ?? ""),
    queryFn: async () => {
      const r = await listMemberAnalyses(memberId as string)
      return r.data?.data?.analyses ?? []
    },
    enabled: Boolean(memberId),
    staleTime: 30_000,
    select: kind ? (rows) => rows.filter((r) => r.kind === kind) : undefined,
  })
}

/**
 * Keep one Studio output.
 *
 * `content` is the document as it was on screen, so the kept row is readable
 * on its own; `inputs` carries what it takes to re-open it. Both, because model
 * output is not reproducible — regenerating would hand the manager a different
 * document under the same title.
 */
export function useSaveAnalysis(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<SavedAnalysis, Error, CreateAnalysisInput>({
    mutationFn: async (input) => {
      const r = await createMemberAnalysis(memberId as string, input)
      const data = r.data?.data
      // A 201 with no body is not a save. Reporting success off the status
      // alone is the "UI that reports success without acting" failure: the
      // manager closes the tab believing the document is kept.
      if (!data?.id) throw new Error("It was not saved.")
      return data
    },
    onSuccess: () => {
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.analyses(memberId) })
    },
  })
}

/** Delete a kept analysis. A 404 means "not there, or not yours" — one answer. */
export function useDeleteAnalysis(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<string, Error, string>({
    mutationFn: async (analysisId) => {
      const r = await deleteMemberAnalysis(memberId as string, analysisId)
      if (!r.data?.data?.deleted) throw new Error("It was not deleted.")
      return analysisId
    },
    onSuccess: () => {
      if (!memberId) return
      qc.invalidateQueries({ queryKey: developmentKeys.analyses(memberId) })
    },
  })
}
