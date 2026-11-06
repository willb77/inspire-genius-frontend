import { agentApi } from "@/lib/agentApi"
import type { CohortExportFormat, CohortReadout } from "@/types/cohortReadout"

/**
 * N-3: whether the cohort read-out is on for the caller's organisation
 * (agent-engine `cohort_readout`, default off, scoped per org). For the menu
 * only — every data route refuses itself while the switch is off.
 */
export async function getCohortReadoutEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/cohort-readout/status",
  )
  return data?.data?.enabled === true
}

function params(since?: string): Record<string, string> | undefined {
  return since ? { since } : undefined
}

/** The caller's own organisation's read-out. The server picks the org from the account. */
export async function getCohortReadout(since?: string): Promise<CohortReadout> {
  const { data } = await agentApi.get<{ status: boolean; data: CohortReadout }>("/v1/agents/cohort-readout", {
    params: params(since),
  })
  return data.data
}

/** The same read-out as a CSV or Word file, built server-side from the suppressed object. */
export async function exportCohortReadout(format: CohortExportFormat, since?: string): Promise<Blob> {
  const response = await agentApi.get("/v1/agents/cohort-readout/export", {
    params: { format, ...(params(since) ?? {}) },
    responseType: "blob",
  })
  return response.data as Blob
}
