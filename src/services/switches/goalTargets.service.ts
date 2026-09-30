import { agentApi } from "@/lib/agentApi"

/**
 * Feeds Phase 3: whether "Make this my target" and goal roadmaps are on for
 * this tier. Not a security check — every target route refuses itself while
 * the switch is off.
 */
export async function getGoalTargetsEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/goal-targets",
  )
  return data?.data?.enabled === true
}
