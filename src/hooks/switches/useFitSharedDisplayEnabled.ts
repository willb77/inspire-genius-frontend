import { useQuery } from "@tanstack/react-query"
import { getFitSharedDisplayEnabled } from "@/services/switches/fitSharedDisplay.service"

/**
 * FIT-5b — `true` only when the server says `fit_shared_display` is on.
 * Fails closed: loading, an error and "off" all read as `false`, so every fit
 * surface renders FIT-5a's output exactly until the switch row exists.
 */
export function useFitSharedDisplayEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "fit-shared-display"],
    queryFn: getFitSharedDisplayEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
