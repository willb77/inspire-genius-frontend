/**
 * The cost figures the super-admin dashboards read from `useCostDashboard()`.
 * Shared by the classic dashboard and the house-style admin home so both
 * derive and format them the same way. A formatter returns null when the
 * figure is missing; each page decides how to show that.
 */
export type CostFigures = {
  totalCost?: number
  costPerUser?: number
  totalSessions?: number
}

export function readCostFigures(costData: unknown): CostFigures {
  const costDash = (costData as Record<string, unknown> | undefined)?.data as
    | Record<string, unknown>
    | undefined
  return {
    totalCost: costDash?.total_cost as number | undefined,
    costPerUser: costDash?.cost_per_user as number | undefined,
    totalSessions: costDash?.total_sessions as number | undefined,
  }
}

export function formatCostPerUser({ costPerUser }: CostFigures): string | null {
  return costPerUser != null ? `$${costPerUser.toFixed(2)}` : null
}

export function formatCostPerSession({ totalCost, totalSessions }: CostFigures): string | null {
  return totalCost != null && totalSessions ? `$${(totalCost / totalSessions).toFixed(3)}` : null
}
