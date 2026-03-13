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
        event_type: "feedback_submitted",
        actor: variables.coach_id,
        resource: "feedback",
        resource_id: variables.message_id,
        details: { rating: variables.rating, conversation_id: variables.conversation_id },
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

export function useFeedbackStats(params: Pick<FeedbackListParams, "coach_id" | "date_from" | "date_to"> = {}) {
  return useQuery<FeedbackStatsResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.stats(params),
    queryFn: () => getFeedbackStats(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
