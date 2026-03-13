import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type {
  SubmitFeedbackPayload,
  FeedbackListParams,
  FeedbackListData,
  FeedbackStatsData,
} from "@/types/feedback"

export type SubmitFeedbackResponse = BaseApiResponse<{ feedback_id: string }>
export type FeedbackListResponse = BaseApiResponse<FeedbackListData>
export type FeedbackStatsResponse = BaseApiResponse<FeedbackStatsData>

export async function submitFeedback(payload: SubmitFeedbackPayload) {
  const { data } = await api.post<SubmitFeedbackResponse>("/v1/feedback", payload)
  return data
}

export async function getFeedbackList(params: FeedbackListParams = {}) {
  const { data } = await api.get<FeedbackListResponse>("/v1/feedback", { params })
  return data
}

export async function getFeedbackStats(params: Pick<FeedbackListParams, "coach_id" | "date_from" | "date_to"> = {}) {
  const { data } = await api.get<FeedbackStatsResponse>("/v1/feedback/stats", { params })
  return data
}
