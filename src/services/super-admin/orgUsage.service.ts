import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type { MemberUsage, OrgUsage } from "@/types/super-admin/orgUsage"

/**
 * Organizations → Action → Activity (observability-service, super-admin only).
 *
 * Both calls THROW on failure, including 404. Unlike the per-response
 * observability reads, an empty shape here would be a claim: "this
 * organization used nothing" or "this person never used IG". A failed read
 * must render as a failure, never as zero usage.
 */
export async function getOrgUsage(orgId: string, days: number): Promise<OrgUsage> {
  const r = await api.get<BaseApiResponse<OrgUsage>>(
    `/v1/observability/orgs/${encodeURIComponent(orgId)}/usage`,
    { params: { days } },
  )
  return r.data.data as OrgUsage
}

export async function getMemberUsage(
  orgId: string,
  userId: string,
  days: number,
): Promise<MemberUsage> {
  const r = await api.get<BaseApiResponse<MemberUsage>>(
    `/v1/observability/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}/usage`,
    { params: { days } },
  )
  return r.data.data as MemberUsage
}
