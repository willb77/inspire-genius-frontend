export type FeedbackEntry = {
  id: string
  message_id: string
  conversation_id: string
  coach_id: string
  user_id: string
  rating: 1 | 2 | 3 | 4 | 5
  correction_text?: string | null
  created_at: string
}

export type SubmitFeedbackPayload = {
  message_id: string
  conversation_id: string
  coach_id: string
  rating: number
  correction_text?: string
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
