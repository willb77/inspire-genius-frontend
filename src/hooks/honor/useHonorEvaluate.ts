import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { toast } from "sonner"
import { sendHonorEvaluation, type HonorEvalReply } from "@/services/honor/honorChat"
import {
  evaluateFellow,
  getFellowPrism,
  getFellowSources,
  requestFellowPrism,
} from "@/services/honor/coach.service"
import type {
  HonorEvaluateBody,
  HonorEvaluation,
  HonorFellowSources,
  HonorPrismReport,
} from "@/types/honor"

/**
 * Live member-evaluation mutation — reuses the Meridian async-jobs transport
 * (the Summit pattern) via {@link sendHonorEvaluation}. Used for the optional
 * "Narrate with Meridian" prose step; on any error the caller falls back to the
 * seeded canned answers so the surface never breaks (see HonorEvaluate).
 */
export function useHonorEvaluate() {
  return useMutation<HonorEvalReply, Error, { prompt: string; memberId?: string }>({
    mutationFn: ({ prompt, memberId }) => sendHonorEvaluation(prompt, { memberId }),
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
