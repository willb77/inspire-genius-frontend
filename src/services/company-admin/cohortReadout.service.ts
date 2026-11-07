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

function params(since?: string, orgId?: string): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  if (since) out.since = since
  if (orgId) out.org_id = orgId
  return Object.keys(out).length ? out : undefined
}

/**
 * The read-out. A company-admin passes no `orgId`: the server picks their own
 * org from the account. A super-admin must name one — the server answers 422
 * without it — so the super-admin page never calls this until an org is picked.
 */
export async function getCohortReadout(since?: string, orgId?: string): Promise<CohortReadout> {
  const { data } = await agentApi.get<{ status: boolean; data: CohortReadout }>("/v1/agents/cohort-readout", {
    params: params(since, orgId),
  })
  return data.data
}

/** The same read-out as a CSV or Word file, built server-side from the suppressed object. */
export async function exportCohortReadout(format: CohortExportFormat, since?: string, orgId?: string): Promise<Blob> {
  const response = await agentApi.get("/v1/agents/cohort-readout/export", {
    params: { format, ...(params(since, orgId) ?? {}) },
    responseType: "blob",
  })
  return response.data as Blob
}
