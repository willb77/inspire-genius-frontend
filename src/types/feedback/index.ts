export type FeedbackEntry = {
  feedback_id: string
  session_id: string
  agent_id: string
  message_id: string
  feedback_type: FeedbackType
  value: number
  text?: string | null
  user_id?: string
  created_at: string
  spam_score?: number
  // Legacy aliases used by FeedbackHistory page
  id?: string
  coach_id?: string
  conversation_id?: string
  rating?: number
  correction_text?: string | null
}

export type FeedbackType = "thumbs" | "rating" | "text" | "comparison"

export type SubmitFeedbackPayload = {
  session_id: string
  agent_id: string
  message_id: string
  feedback_type: FeedbackType
  value: number
  text?: string
  comparison_message_id?: string
  user_id?: string
}

export type FeedbackListParams = {
  coach_id?: string
  user_id?: string
  rating?: number
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export type FeedbackListData = {
  feedback: FeedbackEntry[]
  pagination: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
}

export type FeedbackStatsData = {
  total_count: number
  avg_rating: number
  rating_distribution: Record<string, number>
  top_corrections: Array<{ text: string; count: number }>
}
