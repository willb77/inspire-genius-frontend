/** M.4 — types for the /v1/memory/* tier-aware privacy endpoints. */

export interface MemoryInsight {
  id?: string
  key: string
  value: string
  category?: string
  confidence?: number
  source_session_id?: string | null
  created_at?: string | null
}

export interface MemoryMilestone {
  id: string
  milestone: string
  description?: string | null
  category?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

export interface MemoryPrismResult {
  gold: number
  green: number
  blue: number
  orange: number
  version?: string
  raw_data?: Record<string, unknown> | null
}

export interface MemoryConversationMessage {
  id?: string
  session_id?: string
  role: string
  content: string
  agent?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

export interface MemoryConversation {
  session_id: string
  messages: MemoryConversationMessage[]
}

export interface MemorySessionSummary {
  id?: string
  session_id: string
  summary: string
  topics?: string[] | null
  coaching_progress?: Record<string, unknown> | null
  message_count?: number
  created_at?: string | null
}

export interface MemorySemanticEntry {
  id?: string
  category?: string
  source_id?: string | null
  text?: string
  metadata?: Record<string, unknown> | null
  created_at?: number | string | null
}

export interface MemorySnapshot {
  user_id: string
  tiers: {
    long_term?: {
      insights: MemoryInsight[]
      milestones: MemoryMilestone[]
      prism: MemoryPrismResult | null
    }
    short_term?: {
      session_summaries: MemorySessionSummary[]
      conversation_history: MemoryConversation[]
    }
    semantic?: {
      entries: MemorySemanticEntry[]
      count: number
    }
  }
}

export interface MemoryDeleteResponse {
  status: string
  user_id: string
  forgot?: Record<string, unknown>
  insight_key?: string
}
