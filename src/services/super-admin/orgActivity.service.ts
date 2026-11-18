import { agentApi } from "@/lib/agentApi"
import { getOrgDirectory } from "@/services/super-admin/user-management/org-assignment.service"
import type {
  OrgActivityDocx,
  OrgActivityOrg,
  OrgActivityReport,
} from "@/types/super-admin/orgActivity"

/**
 * Organization activity report (agent-engine, super-admin only).
 *
 * Mounted under `/v1/agents/` — the only prefix API Gateway routes to the
 * engine — so these go through `agentApi`. The token is injected by the axios
 * interceptor as a header; it is never put in a URL, including for the .docx.
 *
 * Every call THROWS on failure. An empty report is a claim ("this organization
 * did nothing"); a failed read must render as a failure.
 */
const BASE = "/v1/agents/admin/org-activity"

/**
 * The org list is the one the User Management org picker already uses
 * (`GET /v1/orgs/directory`, public.organization). Member counts come from the
 * engine; an organization with no profiles has no count row and reads as 0.
 */
export async function getOrgActivityOrgs(): Promise<OrgActivityOrg[]> {
  const [orgs, counts] = await Promise.all([
    getOrgDirectory(),
    agentApi.get<{ data: { counts: Record<string, number> } }>(`${BASE}/member-counts`),
  ])
  const byId = counts.data.data.counts ?? {}
  return orgs.map((o) => ({ id: o.id, name: o.name, memberCount: byId[o.id] ?? 0 }))
}

export async function getOrgActivityReport(
  orgId: string,
  includeInternal: boolean,
): Promise<OrgActivityReport> {
  const { data } = await agentApi.get<{ data: OrgActivityReport }>(`${BASE}/report`, {
    params: { org_id: orgId, include_internal: includeInternal },
  })
  return data.data
}

function filenameFrom(disposition: unknown, fallback: string): string {
  const m = /filename="?([^";]+)"?/i.exec(typeof disposition === "string" ? disposition : "")
  return m ? m[1] : fallback
}

export async function downloadOrgActivityDocx(
  orgId: string,
  includeInternal: boolean,
): Promise<OrgActivityDocx> {
  const r = await agentApi.get<Blob>(`${BASE}/report.docx`, {
    params: { org_id: orgId, include_internal: includeInternal },
    responseType: "blob",
  })
  return {
    blob: r.data,
    filename: filenameFrom(r.headers?.["content-disposition"], "Organization_Activity_Report.docx"),
  }
}
