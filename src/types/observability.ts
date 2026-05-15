export type ResponseObservability = {
  id: string
  message_id: string | null
  conversation_id: string | null
  session_id: string
  user_id: string | null
  agent_name: string
  domain: string | null
  orchestrator: string | null
  model_id: string | null
  model_tier: string | null
  provider: string | null
  input_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_cost_usd: number
  latency_ms: number
  ttft_ms: number | null
  rag_enabled: boolean
  rag_chunks_retrieved: number
  rag_parent_docs_used: number
  rag_retrieval_ms: number | null
  rag_categories: string[] | null
  confidence: number
  memory_accessed: boolean
  memory_items_loaded: number
  tools_called: string[] | null
  tool_count: number
  error_occurred: boolean
  error_message: string | null
  created_at: string
}

export type SessionObservability = {
  id: string
  session_id: string
  conversation_id: string | null
  user_id: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  message_count: number
  response_count: number
  agents_used: string[] | null
  domains_used: string[] | null
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_cost_usd: number
  avg_latency_ms: number | null
  max_latency_ms: number | null
  avg_confidence: number | null
  min_confidence: number | null
  rag_queries: number
  tool_calls_total: number
  errors: number
  memory_updates: number
  created_at: string
}

export type DashboardMetrics = {
  total_responses_today: number
  total_tokens_today: number
  total_cost_today: number
  avg_latency_ms: number | null
  avg_confidence: number | null
  error_rate: number
  active_sessions: number
  unique_users_today: number
  top_agents: { agent: string; count: number; avg_confidence: number }[]
  cost_by_model: { model_tier: string; cost: number; count: number }[]
}

export type ObservabilityExportFormat = "json" | "csv" | "pdf"

/** Role-filtered fields — determines what each role can see */
export const OBSERVABILITY_FIELDS_BY_ROLE = {
  "super-admin": "all",
  "company-admin": [
    "agent_name", "domain", "model_tier", "input_tokens", "output_tokens",
    "total_tokens", "estimated_cost_usd", "latency_ms", "confidence",
    "rag_enabled", "rag_chunks_retrieved", "memory_accessed", "tools_called",
    "tool_count", "error_occurred", "error_message",
  ],
  practitioner: [
    "agent_name", "domain", "model_tier", "confidence", "latency_ms",
    "rag_enabled", "tools_called",
  ],
  user: ["agent_name", "confidence"],
} as const
