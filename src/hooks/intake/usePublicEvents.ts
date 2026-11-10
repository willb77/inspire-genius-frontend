import { useQuery } from "@tanstack/react-query"
import { fetchPublicEvents } from "@/services/intake/publicEvents.service"
import type { PublicEventsResult } from "@/types/publicEvents"

export const PUBLIC_EVENTS_QUERY_KEY = ["intake", "public-events"] as const

/**
 * The public events list. 60 s stale time to match the server's own cache;
 * one retry. A 404 (switch off) is a result, not an error, so it is never retried.
 */
export function usePublicEvents() {
  return useQuery<PublicEventsResult>({
    queryKey: PUBLIC_EVENTS_QUERY_KEY,
    queryFn: fetchPublicEvents,
    staleTime: 60_000,
    retry: 1,
  })
}
