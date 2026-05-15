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
 * Dept-scoped cost telemetry (Wave 3 Lane 3.A — P7.4).
 *
 * Today the observability dashboard endpoint does not filter by department —
 * when R-2.4 adds a `dept_id` query param, pass it through here. Until then
 * the hook surfaces the platform-wide telemetry it CAN see, and the CostBoard
 * banner makes the "data pending" state visible to the manager.
 *
 * Mirrors `useOrgCost` exactly — same data shape, different scope label.
 */
export function useDeptCost(deptId?: string): CostBoardResult {
  const {
    data: metrics,
    isLoading,
    error,
  } = useDashboardMetrics(deptId)

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
