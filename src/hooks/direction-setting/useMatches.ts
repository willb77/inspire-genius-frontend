import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { fitService } from "@/services/job-fit/fit.service"
import type { FitMatch, FitMethod } from "@/types/job-fit"

/**
 * Stage 7 — the user's ranked role matches, read for Direction Setting.
 *
 * This is a thin wrapper over the **existing** Job-Fit client
 * (`fitService.getMatches` → `GET /v1/blueprint/fit/matches`). There is no second
 * fit client, and no second contract: the same endpoint, the same rows, the same
 * numbers as the Job-Fit vertical shows.
 *
 * The one thing it adds over `useFitMatches` is the **gated** flag. That hook
 * returns `res.data.data ?? []`, which throws the response envelope away — and
 * the flag that says "matching is switched off for now" (backend
 * `blueprint_matching_enabled`, default false) lives on the envelope, not in the
 * rows. Without it, a deliberately-disabled feature is indistinguishable from an
 * empty library, and Direction Setting has to tell those two apart: they are
 * different truths and deserve different words.
 */

/**
 * The envelope as it may arrive. Older/other reads return a bare array in
 * `data`; the gate can come back either at the envelope level or wrapped around
 * the rows. Both shapes are read here rather than asserted, so a contract that
 * differs from the one we expect degrades to "not gated, no rows" instead of
 * throwing in the user's face.
 */
type MatchesEnvelope = {
  data?: FitMatch[] | { matches?: FitMatch[]; gated?: boolean }
  gated?: boolean
}

export type MatchesResult = {
  matches: FitMatch[]
  /** True when role matching is switched off platform-side, not merely empty. */
  gated: boolean
}

/** Pull rows + gate out of whichever envelope shape came back. */
export function normalizeMatches(body: MatchesEnvelope | undefined): MatchesResult {
  const payload = body?.data
  if (Array.isArray(payload)) {
    return { matches: payload, gated: body?.gated === true }
  }
  return {
    matches: payload?.matches ?? [],
    gated: body?.gated === true || payload?.gated === true,
  }
}

/**
 * `method` (gap vs closeness) is part of the query key, so switching how the
 * list is ranked refetches rather than re-sorting a stale read. Defaults to
 * "gap" — the backend default — so the bare call is the same call Job-Fit makes.
 */
export function useMatches(
  method: FitMethod = "gap",
  options?: Partial<UseQueryOptions<MatchesResult, AxiosError>>
) {
  return useQuery<MatchesResult, AxiosError>({
    queryKey: ["direction-setting", "matches", method],
    queryFn: async () => {
      const res = await fitService.getMatches(method)
      return normalizeMatches(res.data as MatchesEnvelope)
    },
    staleTime: 60 * 1000,
    ...options,
  })
}
