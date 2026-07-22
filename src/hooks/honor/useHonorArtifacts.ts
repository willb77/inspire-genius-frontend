import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getFellowGoals,
  getFellowSourcesBulk,
  setFellowGoals,
} from "@/services/honor/coach.service"
import {
  importFellowAssessment,
  uploadFellowDocument,
  type HonorDocKind,
} from "@/services/honor/artifact.service"
import type { HonorFramework } from "@/services/honor/assessment.service"
import type { HonorFellowGoals, HonorSourcesBulk } from "@/types/honor"

/**
 * Honor Coach Workbench — the "artifacts" hooks: a fellow's goals text, the
 * bulk per-fellow source status, and a single upload mutation that dispatches on
 * artifact kind (assessment / document / goals). All three keep the shared
 * `["honor","fellow-sources",id]` cache honest after a write.
 */

const HK = "honor"

/** GET …/{id}/goals — the fellow's stored goals & objectives. */
export function useFellowGoals(
  fellowId: string | undefined,
  options?: Partial<UseQueryOptions<HonorFellowGoals | undefined, Error>>,
) {
  return useQuery<HonorFellowGoals | undefined, Error>({
    queryKey: [HK, "fellow-goals", fellowId ?? "none"],
    queryFn: async () => {
      if (!fellowId) return undefined
      const res = await getFellowGoals(fellowId)
      return res.data
    },
    enabled: !!fellowId,
    retry: false,
    ...options,
  })
}

/** PUT …/{id}/goals — save the fellow's goals; refreshes goals + sources. */
export function useSetFellowGoals() {
  const qc = useQueryClient()
  return useMutation<HonorFellowGoals | undefined, Error, { fellowId: string; text: string }>({
    mutationFn: async ({ fellowId, text }) => {
      const res = await setFellowGoals(fellowId, text)
      return res.data
    },
    onSuccess: (_data, { fellowId }) => {
      qc.invalidateQueries({ queryKey: [HK, "fellow-goals", fellowId] })
      qc.invalidateQueries({ queryKey: [HK, "fellow-sources", fellowId] })
    },
  })
}

/**
 * POST …/students/sources-bulk — per-fellow source status for the whole grid.
 * Read-safe: an undeployed endpoint (or a mocked-away service) degrades to an
 * empty map rather than surfacing an error boundary.
 */
export function useFellowSourcesBulk(
  fellowIds: string[],
  options?: Partial<UseQueryOptions<HonorSourcesBulk, Error>>,
) {
  const ids = [...fellowIds].sort()
  return useQuery<HonorSourcesBulk, Error>({
    queryKey: [HK, "fellow-sources-bulk", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return {}
      try {
        const res = await getFellowSourcesBulk(ids)
        return res.data?.sources ?? {}
      } catch {
        return {}
      }
    },
    enabled: ids.length > 0,
    retry: false,
    ...options,
  })
}

/** The variables for a single artifact upload, discriminated by kind. */
export type UploadArtifactVars =
  | { kind: "assessment"; fellowId: string; framework: HonorFramework; file: File }
  | { kind: "doc"; fellowId: string; docKind: HonorDocKind; file: File; subjectUserId?: string }
  | { kind: "goals"; fellowId: string; text: string }

/**
 * One mutation for attaching any artifact to a fellow — dispatches on kind to
 * the assessment importer, the document pipeline, or the goals endpoint. On
 * success it invalidates the fellow's source caches so the status matrix updates.
 */
export function useUploadFellowArtifact() {
  const qc = useQueryClient()
  return useMutation<void, Error, UploadArtifactVars>({
    mutationFn: async (vars) => {
      if (vars.kind === "assessment") {
        await importFellowAssessment(vars.fellowId, vars.framework, vars.file)
      } else if (vars.kind === "doc") {
        // Post-invite the fellow id IS the canonical sub, so it doubles as the
        // subject for member-attributed document RAG when none is given.
        await uploadFellowDocument(vars.file, vars.docKind, vars.subjectUserId ?? vars.fellowId)
      } else {
        await setFellowGoals(vars.fellowId, vars.text)
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [HK, "fellow-sources", vars.fellowId] })
      qc.invalidateQueries({ queryKey: [HK, "fellow-sources-bulk"] })
      qc.invalidateQueries({ queryKey: [HK, "caseload"] })
      if (vars.kind === "goals") {
        qc.invalidateQueries({ queryKey: [HK, "fellow-goals", vars.fellowId] })
      }
    },
    onError: (e) => toast.error(e.message || "Could not attach that artifact."),
  })
}
