import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  submitFeedback,
  getFeedbackList,
  getFeedbackStats,
  type SubmitFeedbackResponse,
  type FeedbackListResponse,
  type FeedbackStatsResponse,
} from "@/services/feedback/feedback.service"
import { logAuditEvent } from "@/services/audit/audit.service"
import type { SubmitFeedbackPayload, FeedbackListParams } from "@/types/feedback"
import type { BaseApiResponse } from "@/types/api"
import { toast } from "sonner"

const QK = {
  list: (params: FeedbackListParams) => ["feedback", "list", params] as const,
  stats: (params: Record<string, string | undefined>) => ["feedback", "stats", params] as const,
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient()

  return useMutation<
    SubmitFeedbackResponse,
    AxiosError<BaseApiResponse<null>>,
    SubmitFeedbackPayload
  >({
    mutationFn: (payload) => submitFeedback(payload),
    onSuccess: (_resp, variables) => {
      toast.success("Thank you for your feedback!")
      queryClient.invalidateQueries({ queryKey: ["feedback"], exact: false })
      logAuditEvent({
        action: "feedback_submitted",
        actor_email: variables.agent_id,
        target_type: "feedback",
        target_id: variables.message_id,
        extra_data: { value: variables.value, session_id: variables.session_id, feedback_type: variables.feedback_type },
      })
    },
    onError: (error) => {
      const msg = error.response?.data?.message || "Failed to submit feedback"
      toast.error(msg)
    },
  })
}

export function useFeedbackList(params: FeedbackListParams) {
  return useQuery<FeedbackListResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.list(params),
    queryFn: () => getFeedbackList(params),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  })
}

/**
 * `GET /v1/admin/feedback/stats` has no backend implementation — 404s on the
 * monolith catch-all. Disabled by default. See IG_backlog.md #9 Bug B.
 *
 * To re-enable globally: change the default for `options.enabled` below to
 * `true` once the backend route is built.
 */
export function useFeedbackStats(
  params: Pick<FeedbackListParams, "coach_id" | "date_from" | "date_to"> = {},
  options?: { enabled?: boolean },
) {
  return useQuery<FeedbackStatsResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.stats(params),
    queryFn: () => getFeedbackStats(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? false,
  })
}
