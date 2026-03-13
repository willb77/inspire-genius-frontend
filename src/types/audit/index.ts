export type AuditLogEntry = {
  id: string
  event_type: string
  actor: string
  actor_id?: string
  resource?: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  timestamp: string
}

export type AuditLogPayload = {
  event_type: string
  actor: string
  actor_id?: string
  resource?: string
  resource_id?: string
  details?: Record<string, unknown>
}

export type AuditLogListParams = {
  event_type?: string
  actor?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export type AuditLogListData = {
  logs: AuditLogEntry[]
  pagination: {
    total: number
    page: number
    limit: number
    has_more: boolean
  }
}

export type AuditStatsData = {
  total_events: number
  events_today: number
  unique_actors: number
}
