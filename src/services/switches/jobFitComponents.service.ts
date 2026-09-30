import { agentApi } from "@/lib/agentApi"

/**
 * Feeds Phase 2: whether Job Fit may show the goal / experience components and
 * the composite on this tier. Not a security check — the backend refuses the
 * components read itself while the switch is off.
 */
export async function getJobFitComponentsEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/job-fit-components",
  )
  return data?.data?.enabled === true
}
