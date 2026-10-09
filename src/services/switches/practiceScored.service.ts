import { agentApi } from "@/lib/agentApi"

/**
 * 3.4 Phase 4: whether Interview Practice may score and save a session on this
 * tier. Not a security check — every practice route refuses itself while the
 * switch is off.
 */
export async function getPracticeScoredEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/practice-scored",
  )
  return data?.data?.enabled === true
}
