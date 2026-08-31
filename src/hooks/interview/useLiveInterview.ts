/**
 * useLiveInterview — React Query mutations/queries wrapping live.service.
 *
 * One hook exposes the whole flow an interviewer drives through: create the
 * session, submit each captured answer, PATCH the interviewer's authoritative
 * score, finalize for the scored write-up, and (optionally) resume a session
 * by id.
 */
import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"

import {
  liveInterviewService,
  type CreateLiveSessionPayload,
  type CreateLiveSessionResult,
  type FinalizeResult,
  type GetSessionResult,
  type LiveAnswer,
  type ScoreAnswerPayload,
  type SubmitAnswerPayload,
  type SubmitAnswerResult,
} from "@/services/interview/live.service"

export function useCreateLiveSession() {
  return useMutation<CreateLiveSessionResult, AxiosError, CreateLiveSessionPayload>({
    mutationFn: (payload) => liveInterviewService.createSession(payload),
  })
}

export function useSubmitLiveAnswer() {
  return useMutation<
    SubmitAnswerResult,
    AxiosError,
    { sessionId: string; payload: SubmitAnswerPayload }
  >({
    mutationFn: ({ sessionId, payload }) => liveInterviewService.submitAnswer(sessionId, payload),
  })
}

export function useScoreLiveAnswer() {
  return useMutation<
    LiveAnswer,
    AxiosError,
    { sessionId: string; answerId: string; payload: ScoreAnswerPayload }
  >({
    mutationFn: ({ sessionId, answerId, payload }) =>
      liveInterviewService.scoreAnswer(sessionId, answerId, payload),
  })
}

export function useFinalizeLiveSession() {
  return useMutation<FinalizeResult, AxiosError, { sessionId: string }>({
    mutationFn: ({ sessionId }) => liveInterviewService.finalize(sessionId),
  })
}

/** Resume/inspect an in-progress or completed session by id. Disabled until an id is known. */
export function useLiveSession(
  sessionId: string | null | undefined,
  options?: Partial<UseQueryOptions<GetSessionResult, AxiosError>>,
) {
  return useQuery<GetSessionResult, AxiosError>({
    queryKey: ["interview", "live", "session", sessionId ?? "none"],
    queryFn: () => liveInterviewService.getSession(sessionId as string),
    enabled: Boolean(sessionId),
    retry: false,
    ...options,
  })
}
