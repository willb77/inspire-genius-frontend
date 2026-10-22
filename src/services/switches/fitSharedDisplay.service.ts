import { agentApi } from "@/lib/agentApi"

/**
 * FIT-5b: whether the shared fit display's visible changes are on for this
 * tier (agent-engine `fit_shared_display`, default off, no row on any tier
 * until one is written). Not a security check — every change it gates is a
 * presentation change over data the person can already read.
 */
export async function getFitSharedDisplayEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/fit-shared-display",
  )
  return data?.data?.enabled === true
}
