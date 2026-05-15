import { useMemo } from "react"
import { useDashboardMetrics } from "@/hooks/observability/useObservability"
import type {
  ObservabilityBoardResult,
  ObservabilityBoardData,
  ObservabilityKpis,
  ObservabilityTopAgent,
} from "./usePlatformObservability"

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

/**
 * Org-scoped observability metrics. Today the observability dashboard
 * endpoint does not filter by org — when R-2.4 adds an `org_id` query
 * param, pass it through here. Until then the hook surfaces the platform
 * data and the ObservabilityBoard banner makes that visible.
 *
 * Mirrors `useOrgCost` exactly — same shape, different telemetry slice.
 */
export function useOrgObservability(orgId?: string): ObservabilityBoardResult {
  const { data: metrics, isLoading, error } = useDashboardMetrics(orgId)

  const normalized = useMemo<ObservabilityBoardData>(() => {
    if (!metrics) return EMPTY_DATA
    return {
      kpis: {
        totalResponsesToday: metrics.total_responses_today ?? 0,
        avgLatencyMs: metrics.avg_latency_ms,
        avgConfidence: metrics.avg_confidence,
        uniqueUsersToday: metrics.unique_users_today ?? 0,
        errorRate: metrics.error_rate ?? 0,
      },
      topAgents: (metrics.top_agents ?? []).map<ObservabilityTopAgent>((a) => ({
        agent: a.agent,
        count: a.count,
        avgConfidence: a.avg_confidence,
      })),
    }
  }, [metrics])

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
