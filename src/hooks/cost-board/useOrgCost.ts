import { useMemo } from "react"
import { useDashboardMetrics } from "@/hooks/observability/useObservability"
import type { CostBoardResult, CostBoardData, CostMentorRow, CostModelTierRow } from "./usePlatformCost"

const EMPTY_DATA: CostBoardData = {
  totalCostUsd: 0,
  totalTokens: 0,
  errorRate: 0,
  costByMentor: [],
  costByModelTier: [],
}

/**
 * Org-scoped cost telemetry. Today the observability dashboard endpoint
 * does not filter by org — when R-2.4 adds an `org_id` query param,
 * pass it through here; until then the hook may return empty data and the
 * CostBoard banner will surface that to the user.
 */
export function useOrgCost(orgId?: string): CostBoardResult {
  const {
    data: metrics,
    isLoading,
    error,
  } = useDashboardMetrics(orgId)

  const normalized = useMemo<CostBoardData>(() => {
    const totalCostUsd = metrics?.total_cost_today ?? 0
    const totalTokens = metrics?.total_tokens_today ?? 0
    const errorRate = metrics?.error_rate ?? 0

    const costByMentor: CostMentorRow[] = (metrics?.top_agents ?? []).map((a) => ({
      agent: a.agent,
      cost: 0,
      sessions: a.count,
      percentage: 0,
    }))

    const costByModelTier: CostModelTierRow[] = (metrics?.cost_by_model ?? []).map(
      (m) => ({
        tier: m.model_tier,
        cost: m.cost,
        count: m.count,
      })
    )

    return { totalCostUsd, totalTokens, errorRate, costByMentor, costByModelTier }
  }, [metrics])

  const hasData =
    normalized.totalCostUsd > 0 ||
    normalized.totalTokens > 0 ||
    normalized.costByMentor.length > 0 ||
    normalized.costByModelTier.length > 0

  return {
    data: hasData ? normalized : EMPTY_DATA,
    hasData,
    isLoading,
    error: error ?? null,
  }
}
