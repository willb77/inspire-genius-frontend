import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { fitService } from "@/services/job-fit/fit.service"
import { normalizeMatches, type MatchesEnvelope, type MatchesResult } from "@/lib/job-fit/matches"
import type { FitMatch, FitMethod } from "@/types/job-fit"

/**
 * The query, exactly as before (`data` is the ranked rows), plus `gated`.
 *
 * `gated` is additive on purpose (FIT-1): every existing consumer reads `data`
 * as a `FitMatch[]` and keeps doing so. It is true when the backend tagged the
 * response `gated: true` (role matching switched off platform-side), which used
 * to be thrown away with the envelope — so a paused feature read as "no roles".
 */
export type FitMatchesQuery = Omit<UseQueryResult<MatchesResult, AxiosError>, "data"> & {
  data: FitMatch[] | undefined
  gated: boolean
}

/**
 * FIT-5b, decision 9: how long one read of the matches stays fresh on the
 * shared key (`["job-fit","matches",method]`). Five minutes — the app-wide
 * default Career Fit already runs on — because every GET writes a
 * `job_fit_snapshots` row server-side, so fewer refetches mean fewer snapshot
 * rows. Direction Setting passes it explicitly when it moves onto this key.
 */
export const FIT_MATCHES_STALE_MS = 5 * 60_000

/**
 * The user's ranked role matches (GET /v1/blueprint/fit/matches).
 *
 * ``method`` (Decision D4) selects the scoring formula and is part of the query
 * key so switching it refetches. Defaults to "gap" (the backend default).
 */
export function useFitMatches(
  method: FitMethod = "gap",
  options?: Partial<UseQueryOptions<MatchesResult, AxiosError>>
): FitMatchesQuery {
  const query = useQuery<MatchesResult, AxiosError>({
    queryKey: ["job-fit", "matches", method],
    queryFn: async () => {
      const res = await fitService.getMatches(method)
      return normalizeMatches(res.data as MatchesEnvelope)
    },
    ...options,
  })
  return {
    ...query,
    data: query.data?.matches,
    gated: query.data?.gated === true,
  }
}
