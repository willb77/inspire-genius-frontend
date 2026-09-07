/**
 * Past interviews — the reader for `GET /v1/agents/interview/live/sessions`.
 *
 * Package IS-C. Until this existed, a closed tab orphaned an `in_progress`
 * session that no surface could reach.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  liveInterviewService,
  type ListSessionsParams,
  type ListSessionsResult,
} from "@/services/interview/live.service"

export const liveSessionsKey = (params: ListSessionsParams) =>
  ["live-interview-sessions", params] as const

export function useLiveSessions(params: ListSessionsParams = {}, enabled = true) {
  return useQuery<ListSessionsResult>({
    queryKey: liveSessionsKey(params),
    queryFn: () => liveInterviewService.listSessions(params),
    enabled,
  })
}

export function useAbandonLiveSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => liveInterviewService.abandonSession(sessionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["live-interview-sessions"] })
    },
  })
}
