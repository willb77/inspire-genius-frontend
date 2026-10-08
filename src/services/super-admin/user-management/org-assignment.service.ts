import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'

// Super-admin organisation assignment, through org-service.
//
// Membership is ONE column (`user_profiles.org_id`), so assigning a user who
// already has an organisation moves them out of it. org-service refuses that
// move for anyone but a platform operator, and records the actor and the
// previous organisation on its OrgMemberAdded event.

export type OrgDirectoryItem = {
  id: string
  name: string
  active?: boolean
}

type OrgEnvelope<T> = { success?: boolean; data: T; message?: string }

/** Every live organisation. Platform-only route: GET /v1/orgs/directory. */
export async function getOrgDirectory(): Promise<OrgDirectoryItem[]> {
  const { data } = await api.get<OrgEnvelope<OrgDirectoryItem[]>>('/v1/orgs/directory')
  return data.data ?? []
}

/** Put the user in `orgId` (a move when they already have another org). */
export async function assignUserToOrg(orgId: string, userId: string) {
  const { data } = await api.post<OrgEnvelope<{ user_id: string; org_id: string }>>(
    `/v1/orgs/${encodeURIComponent(orgId)}/members`,
    { user_id: userId },
  )
  return data.data
}

/** Clear the user's organisation. */
export async function removeUserFromOrg(orgId: string, userId: string) {
  const { data } = await api.delete<BaseApiResponse<unknown>>(
    `/v1/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`,
  )
  return data
}
