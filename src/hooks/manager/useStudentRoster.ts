import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getStudentRoster,
  requestStudentAccess,
} from "@/services/manager/studentRoster.service"

export const STUDENT_ROSTER_KEY = ["manager", "student-roster"] as const

/**
 * The manager's consent-gated student roster.
 *
 * `retry: false` on purpose. The default retry turns a 403 — "you are not a
 * supervisory role" — into three identical failures and several seconds of
 * spinner before the page can say anything true. A permission answer is not a
 * transient fault and re-asking will not change it.
 */
export function useStudentRoster() {
  return useQuery({
    queryKey: STUDENT_ROSTER_KEY,
    queryFn: getStudentRoster,
    retry: false,
    staleTime: 60_000,
  })
}

export function useRequestStudentAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: requestStudentAccess,
    // Refetch rather than patch the cache optimistically: the backend enforces
    // one live request per pair, so the authoritative answer to "did my request
    // land" is the server's, and an optimistic "pending" that the server
    // rejected would be a UI reporting success without acting.
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENT_ROSTER_KEY }),
  })
}
