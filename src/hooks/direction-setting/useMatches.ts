import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { fitService } from "@/services/job-fit/fit.service"
import type { FitMethod } from "@/types/job-fit"
import { normalizeMatches, type MatchesEnvelope, type MatchesResult } from "@/lib/job-fit/matches"

/**
 * Stage 7 — the user's ranked role matches, read for Direction Setting.
 *
 * This is a thin wrapper over the **existing** Job-Fit client
 * (`fitService.getMatches` → `GET /v1/blueprint/fit/matches`). There is no second
 * fit client, and no second contract: the same endpoint, the same rows, the same
 * numbers as the Job-Fit vertical shows.
 *
 * The one thing it adds is the **gated** flag. (Until FIT-1 `useFitMatches`
 * returned `res.data.data ?? []`, which threw the response envelope away — and
 * the flag that says "matching is switched off for now" (backend
 * `blueprint_matching_enabled`, default false) lives on the envelope, not in the
 * rows. Without it, a deliberately-disabled feature is indistinguishable from an
 * empty library, and Direction Setting has to tell those two apart: they are
 * different truths and deserve different words. `useFitMatches` now exposes
 * the same flag, read by the same `normalizeMatches`.)
 */

// The envelope reader moved to `@/lib/job-fit/matches` so Career Fit reads the
// gate the same way (FIT-1). Re-exported here so existing imports keep working.
export { normalizeMatches } from "@/lib/job-fit/matches"
export type { MatchesResult } from "@/lib/job-fit/matches"

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
