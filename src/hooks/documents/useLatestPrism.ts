/**
 * useLatestPrism — React Query hook for the user's most recent PRISM CSV.
 *
 * Wraps `getLatestPrism` from the document service, which calls the
 * agent-engine `GET /v1/documents/latest-prism` endpoint.
 *
 * Used by the Meridian chat page to auto-attach the most recent PRISM
 * upload for context. A 404 response (no_prism_csv) is the normal state
 * for users who haven't uploaded a PRISM CSV yet; the hook does not
 * retry on 404 to avoid burning attempts on a known-empty result.
 */

import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  getLatestPrism,
  type LatestPrismDocument,
} from "@/services/documents/documentService";

type UseLatestPrismOptions = {
  enabled?: boolean;
};

export function useLatestPrism(options?: UseLatestPrismOptions) {
  return useQuery<LatestPrismDocument>({
    queryKey: ["documents", "latest-prism"],
    queryFn: getLatestPrism,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => {
      // 404 = user has no PRISM CSV yet. Treat as a terminal state and
      // do not retry — it is the expected response for first-time users.
      const status = (err as AxiosError)?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
    enabled: options?.enabled ?? true,
  });
}
