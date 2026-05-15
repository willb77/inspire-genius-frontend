import { useMemo } from "react"
import { useDashboardMetrics } from "@/hooks/observability/useObservability"
import type { DashboardMetrics } from "@/types/observability"

export type ObservabilityKpis = {
  totalResponsesToday: number
  avgLatencyMs: number | null
  avgConfidence: number | null
  uniqueUsersToday: number
  errorRate: number
}

export type ObservabilityTopAgent = {
  agent: string
  count: number
  avgConfidence: number
}

export type ObservabilityBoardData = {
  kpis: ObservabilityKpis
  topAgents: ObservabilityTopAgent[]
}

export type ObservabilityBoardResult = {
  data: ObservabilityBoardData
  hasData: boolean
  isLoading: boolean
  error: unknown
}

const EMPTY_KPIS: ObservabilityKpis = {
  totalResponsesToday: 0,
  avgLatencyMs: null,
  avgConfidence: null,
  uniqueUsersToday: 0,
  errorRate: 0,
}

const EMPTY_DATA: ObservabilityBoardData = {
  kpis: EMPTY_KPIS,
  topAgents: [],
}

function normalise(metrics: DashboardMetrics | undefined): ObservabilityBoardData {
  if (!metrics) return EMPTY_DATA
  return {
    kpis: {
      totalResponsesToday: metrics.total_responses_today ?? 0,
      avgLatencyMs: metrics.avg_latency_ms,
      avgConfidence: metrics.avg_confidence,
      uniqueUsersToday: metrics.unique_users_today ?? 0,
      errorRate: metrics.error_rate ?? 0,
    },
    topAgents: (metrics.top_agents ?? []).map((a) => ({
      agent: a.agent,
      count: a.count,
      avgConfidence: a.avg_confidence,
    })),
  }
}

export function usePlatformObservability(): ObservabilityBoardResult {
  const { data: metrics, isLoading, error } = useDashboardMetrics()

  const normalized = useMemo(() => normalise(metrics), [metrics])

  const hasData =
    normalized.kpis.totalResponsesToday > 0 ||
    normalized.kpis.uniqueUsersToday > 0 ||
    normalized.topAgents.length > 0

  return {
    data: hasData ? normalized : EMPTY_DATA,
    hasData,
    isLoading,
    error: error ?? null,
  }
}
