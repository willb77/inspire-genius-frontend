import { useQuery } from "@tanstack/react-query"
import { listCoachingNotes } from "@/services/manager/development/growthService"
import { developmentKeys } from "./queryKeys"

export function isForbidden(err: unknown): boolean {
  return (err as { response?: { status?: number } } | null)?.response?.status === 403
}

/**
 * D-15 ("practitioner: hide"). True only when the server has REFUSED this
 * caller the member's coaching surfaces (notes, the full PRISM profile, goals)
 * with a 403 — the coaching gate admits a roster row or a direct report, not
 * a shared organisation. The page then hides those sections instead of
 * rendering a refusal, or an empty state that reads like "nothing yet".
 *
 * Asks the notes route because it runs the same gate as the other two and is
 * the cheapest read. A 403 is not retried (it is an answer); any other failure
 * is not treated as a refusal, so the sections stay and render their own state.
 * This decides nothing about access — the server's gate is the boundary.
 */
export function useCoachingAccessDenied(memberId: string | undefined, enabled: boolean): boolean {
  const q = useQuery<boolean>({
    queryKey: [...developmentKeys.all, "coaching-access", memberId ?? ""] as const,
    queryFn: async () => {
      try {
        await listCoachingNotes(memberId as string)
        return false
      } catch (err) {
        if (isForbidden(err)) return true
        throw err
      }
    },
    enabled: enabled && Boolean(memberId),
    retry: false,
    staleTime: 5 * 60_000,
  })
  return q.data === true
}
