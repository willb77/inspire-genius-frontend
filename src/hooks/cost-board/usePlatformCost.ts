import { useMemo } from "react"
import { useCostDashboard } from "@/hooks/trainer/useTrainer"
import { useDashboardMetrics } from "@/hooks/observability/useObservability"

export type CostMentorRow = {
  agent: string
  cost: number
  sessions: number
  percentage: number
}

export type CostModelTierRow = {
  tier: string
  cost: number
  count: number
}

export type CostBoardData = {
  totalCostUsd: number
  totalTokens: number
  errorRate: number
  costByMentor: CostMentorRow[]
  costByModelTier: CostModelTierRow[]
}

export type CostBoardResult = {
  data: CostBoardData
  hasData: boolean
  isLoading: boolean
  error: unknown
}

const EMPTY_DATA: CostBoardData = {
  totalCostUsd: 0,
  totalTokens: 0,
  errorRate: 0,
  costByMentor: [],
  costByModelTier: [],
}

export function usePlatformCost(): CostBoardResult {
  const {
    data: costData,
    isLoading: isCostLoading,
    error: costError,
  } = useCostDashboard()
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    error: metricsError,
  } = useDashboardMetrics()

  const normalized = useMemo<CostBoardData>(() => {
    const costDash = (costData as Record<string, unknown> | undefined)?.data as
      | Record<string, unknown>
      | undefined

    const agentCosts =
      (costDash?.agent_costs as
        | Array<{ agent: string; sessions?: number; cost: number; percentage?: number }>
        | undefined) ?? []

    const totalCostFromTrainer = (costDash?.total_cost as number | undefined) ?? 0
    const totalCostFromObs = metrics?.total_cost_today ?? 0
    const totalTokens = metrics?.total_tokens_today ?? 0
    const errorRate = metrics?.error_rate ?? 0

    const costByMentor: CostMentorRow[] = agentCosts.map((a) => ({
      agent: a.agent,
      cost: a.cost ?? 0,
      sessions: a.sessions ?? 0,
      percentage: a.percentage ?? 0,
    }))

    const costByModelTier: CostModelTierRow[] = (metrics?.cost_by_model ?? []).map(
      (m) => ({
        tier: m.model_tier,
        cost: m.cost,
        count: m.count,
      })
    )

    return {
      totalCostUsd: totalCostFromTrainer || totalCostFromObs,
      totalTokens,
      errorRate,
      costByMentor,
      costByModelTier,
    }
  }, [costData, metrics])

  const hasData =
    normalized.totalCostUsd > 0 ||
    normalized.totalTokens > 0 ||
    normalized.costByMentor.length > 0 ||
    normalized.costByModelTier.length > 0

  return {
    data: hasData ? normalized : EMPTY_DATA,
    hasData,
    isLoading: isCostLoading || isMetricsLoading,
    error: costError ?? metricsError ?? null,
  }
}
