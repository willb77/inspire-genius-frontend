export type AuditLogEntry = {
  id: string
  action: string
  actor_type: string
  actor_id?: string | null
  actor_email?: string | null
  company_id?: string | null
  location_id?: string | null
  target_type?: string | null
  target_id?: string | null
  description?: string | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  tokens_input?: number | null
  tokens_output?: number | null
  duration_ms?: number | null
  cost_usd?: number | null
  model_name?: string | null
  ip_address?: string | null
  user_agent?: string | null
  session_id?: string | null
  request_id?: string | null
  extra_data?: Record<string, unknown> | null
  checksum?: string | null
  partition_key?: string | null
  timestamp: string
}

export type AuditLogPayload = {
  action: string
  actor_type?: string
  actor_id?: string
  actor_email?: string
  company_id?: string
  location_id?: string
  target_type?: string
  target_id?: string
  description?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  tokens_input?: number
  tokens_output?: number
  duration_ms?: number
  cost_usd?: number
  model_name?: string
  ip_address?: string
  user_agent?: string
  session_id?: string
  request_id?: string
  extra_data?: Record<string, unknown>
}

export type AuditLogListParams = {
  action?: string
  actor_type?: string
  actor_id?: string
  company_id?: string
  target_type?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export type AuditLogListData = {
  logs: AuditLogEntry[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export type AuditStatsData = {
  total_logs: number
  logs_today: number
  logs_this_week: number
  logs_this_month: number
  top_actions: { action: string; count: number }[]
  top_actors: { email: string; type: string; count: number }[]
  ai_usage: {
    total_tokens_input: number
    total_tokens_output: number
    total_duration_ms: number
    total_cost_usd: number
    request_count: number
  }
  storage_size_mb: number
}
