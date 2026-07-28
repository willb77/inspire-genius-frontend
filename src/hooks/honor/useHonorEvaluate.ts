import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { sendHonorEvaluation, type HonorEvalReply } from "@/services/honor/honorChat"
import {
  deleteEvaluation,
  evaluateFellow,
  getEvaluation,
  getFellowPrism,
  getFellowSources,
  listEvaluations,
  requestFellowPrism,
  requestPrismReport,
  saveEvaluation,
} from "@/services/honor/coach.service"
import type {
  HonorEvaluateBody,
  HonorEvaluation,
  HonorFellowSources,
  HonorPrismReport,
  HonorPrismReportInput,
  HonorPrismReportResult,
  HonorSavedEvaluation,
  HonorSavedEvaluationSummary,
  SaveEvaluationBody,
} from "@/types/honor"

/**
 * Live member-evaluation mutation — reuses the Meridian async-jobs transport
 * (the Summit pattern) via {@link sendHonorEvaluation}. Used for the optional
 * "Narrate with Meridian" prose step; on any error the caller falls back to the
 * seeded canned answers so the surface never breaks (see HonorEvaluate).
 */
export function useHonorEvaluate() {
  return useMutation<
    HonorEvalReply,
    Error,
    { prompt: string; memberId?: string; memberIds?: string[] }
  >({
    mutationFn: ({ prompt, memberId, memberIds }) =>
      sendHonorEvaluation(prompt, { memberId, memberIds }),
  })
}

/**
 * Deterministic evaluation mutation — POST …/{fellow_id}/evaluate (Phase 2).
 * Returns the fully-scored, source-tagged backbone the surface renders. The
 * FELLOW is the subject (ownership-gated server-side); comparative `memberIds`
 * are ownership-gated too. Zero model calls in the score path.
 */
export function useHonorEvaluateReport() {
  return useMutation<
    HonorEvaluation | undefined,
    Error,
    { fellowId: string; body?: HonorEvaluateBody }
  >({
    mutationFn: async ({ fellowId, body }) => {
      const res = await evaluateFellow(fellowId, body)
      return res.data
    },
  })
}

/**
 * The sources a fellow has submitted — GET …/{fellowId}/sources. Drives the
 * per-fellow "documents on file" badges + the source-selection checkboxes.
 * Read-safe: fetched only when a fellow is selected.
 */
export function useFellowSources(
  fellowId: string | undefined,
  options?: Partial<UseQueryOptions<HonorFellowSources | undefined, Error>>,
) {
  return useQuery<HonorFellowSources | undefined, Error>({
    queryKey: ["honor", "fellow-sources", fellowId ?? "none"],
    queryFn: async () => {
      if (!fellowId) return undefined
      const res = await getFellowSources(fellowId)
      return res.data
    },
    enabled: !!fellowId,
    retry: false,
    ...options,
  })
}

/**
 * The fellow's PRISM report — GET …/{fellowId}/prism. Drives the Fellow Profile
 * PRISM Report tab: shows the scores when a report is on file, or hasReport:false
 * to prompt a request.
 */
export function useFellowPrism(
  fellowId: string | undefined,
  options?: Partial<UseQueryOptions<HonorPrismReport | undefined, Error>>,
) {
  return useQuery<HonorPrismReport | undefined, Error>({
    queryKey: ["honor", "fellow-prism", fellowId ?? "none"],
    queryFn: async () => {
      if (!fellowId) return undefined
      const res = await getFellowPrism(fellowId)
      return res.data
    },
    enabled: !!fellowId,
    retry: false,
    ...options,
  })
}

/** React Query key for a fellow's saved-evaluation history list. */
export const evaluationHistoryKey = (fellowId: string | undefined) =>
  ["honor", "evaluations", fellowId ?? "none"] as const

/**
 * Save a run of the evaluation (deterministic backbone + Nova narrative) —
 * POST …/{fellowId}/evaluations. Invalidates the history list on success so the
 * new entry appears immediately.
 */
export function useSaveEvaluation() {
  const qc = useQueryClient()
  return useMutation<
    HonorSavedEvaluationSummary | undefined,
    Error,
    { fellowId: string; body: SaveEvaluationBody }
  >({
    mutationFn: async ({ fellowId, body }) => {
      const res = await saveEvaluation(fellowId, body)
      return res.data
    },
    onSuccess: (_data, { fellowId }) => {
      void qc.invalidateQueries({ queryKey: evaluationHistoryKey(fellowId) })
      toast.success("Evaluation saved.")
    },
    onError: () => toast.error("Could not save the evaluation."),
  })
}

/**
 * The coach's saved evaluations for a fellow (summary list) — GET …/{fellowId}/
 * evaluations. Read-safe: fetched only when a fellow is selected.
 */
export function useEvaluationHistory(
  fellowId: string | undefined,
  options?: Partial<UseQueryOptions<HonorSavedEvaluationSummary[], Error>>,
) {
  return useQuery<HonorSavedEvaluationSummary[], Error>({
    queryKey: evaluationHistoryKey(fellowId),
    queryFn: async () => {
      if (!fellowId) return []
      const res = await listEvaluations(fellowId)
      return res.data?.evaluations ?? []
    },
    enabled: !!fellowId,
    retry: false,
    ...options,
  })
}

/**
 * Load one saved evaluation full (backbone + narrative) — used when the coach
 * clicks a history entry to reload it into the view. Returns a fetcher the caller
 * invokes on demand (not an always-on query).
 */
export function useLoadSavedEvaluation() {
  return useMutation<HonorSavedEvaluation | undefined, Error, { fellowId: string; evaluationId: string }>({
    mutationFn: async ({ fellowId, evaluationId }) => {
      const res = await getEvaluation(fellowId, evaluationId)
      return res.data
    },
    onError: () => toast.error("Could not load that saved evaluation."),
  })
}

/** Delete a saved evaluation — invalidates the history list on success. */
export function useDeleteEvaluation() {
  const qc = useQueryClient()
  return useMutation<{ deleted: boolean; id: string } | undefined, Error, { fellowId: string; evaluationId: string }>({
    mutationFn: async ({ fellowId, evaluationId }) => {
      const res = await deleteEvaluation(fellowId, evaluationId)
      return res.data
    },
    onSuccess: (_data, { fellowId }) => {
      void qc.invalidateQueries({ queryKey: evaluationHistoryKey(fellowId) })
      toast.success("Saved evaluation deleted.")
    },
    onError: () => toast.error("Could not delete that saved evaluation."),
  })
}

/** Request a fellow's PRISM report — POST …/{fellowId}/prism/request. */
export function useRequestFellowPrism() {
  return useMutation<{ fellowId: string; requested: boolean } | undefined, Error, string>({
    mutationFn: async (fellowId: string) => {
      const res = await requestFellowPrism(fellowId)
      return res.data
    },
    onSuccess: () => toast.success("PRISM report requested."),
    onError: () => toast.error("Could not send the PRISM report request."),
  })
}

/**
 * Request a PRISM report for a NEW person (fname/lname/email). role=user and
 * organization "The Honor Foundation" are fixed server-side. Provisions the
 * person's platform login and submits the PRISM candidate.
 */
export function useRequestPrismReport() {
  return useMutation<HonorPrismReportResult | undefined, Error, HonorPrismReportInput>({
    mutationFn: async (input) => {
      const res = await requestPrismReport(input)
      return res.data
    },
    onSuccess: () => toast.success("PRISM report requested."),
    onError: () => toast.error("Couldn't request the PRISM report. Please try again."),
  })
}
