import type { CostBoardResult, CostBoardData } from "./usePlatformCost"

const EMPTY_DATA: CostBoardData = {
  totalCostUsd: 0,
  totalTokens: 0,
  errorRate: 0,
  costByMentor: [],
  costByModelTier: [],
}

/**
 * Dept-scoped cost telemetry. Reserved for Wave 3 Lane 3.A
 * (manager Cost Slice). Returns empty data today so the CostBoard renders
 * its data-pending banner.
 */
// TODO(R-2.4 / Wave 3 Lane 3.A): wire to dept-scoped cost endpoint
//   once manager Cost Slice ships. See REMAINING_TASKS.md.
export function useDeptCost(deptId?: string): CostBoardResult {
  void deptId
  return {
    data: EMPTY_DATA,
    hasData: false,
    isLoading: false,
    error: null,
  }
}
