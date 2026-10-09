import { useQuery } from "@tanstack/react-query"
import { getPracticeScoredEnabled } from "@/services/switches/practiceScored.service"

/** `true` only when the server says scored practice is on. Loading, an error
 * and "off" all read as `false`, so the practice page renders as it does today. */
export function usePracticeScoredEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "practice-scored"],
    queryFn: getPracticeScoredEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
