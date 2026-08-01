import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getMarketSalaries } from "@/services/direction-setting/market.service"
import type { MarketSalaries } from "@/types/direction-setting"

export const marketKeys = {
  all: ["direction-setting", "market"] as const,
  salaries: (limit: number) =>
    ["direction-setting", "market", "salaries", limit] as const,
}

/**
 * Stage 4 — wage ranges for the caller's ranked career areas.
 *
 * A plain read, not a job: the route prices out of a table already in the
 * process, so it answers inside the request. Nothing here polls.
 *
 * `retry: false` for the same reason `useCareerAreas` sets it. The informative
 * cases — no PRISM on file, or an area with no wage series behind it — all come
 * back as a **200** with a `note` and a `null` range. A non-200 is therefore a
 * genuine fault worth surfacing immediately rather than retrying behind a
 * spinner that eventually says the same thing.
 *
 * Long `staleTime`: the underlying figures are a curated static table with a
 * vintage measured in months. Refetching them on every focus buys nothing and
 * costs a round trip.
 */
export function useMarketSalaries(
  limit = 5,
  options?: Partial<UseQueryOptions<MarketSalaries | undefined, AxiosError>>
) {
  return useQuery<MarketSalaries | undefined, AxiosError>({
    queryKey: marketKeys.salaries(limit),
    queryFn: async () => (await getMarketSalaries(limit)).data,
    retry: false,
    staleTime: 10 * 60 * 1000,
    ...options,
  })
}
