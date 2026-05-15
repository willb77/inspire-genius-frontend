import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'

export type UserManagementUser = {
  user_id: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  role: string
  user_status: 'active' | 'inactive' | string
  is_active: boolean
  is_deleted: boolean
  is_email_verified: boolean
  created_at: string
  updated_at: string
  invitation_id: string | null
  invitation_status: 'accepted' | 'pending' | 'expired' | string | null
  main_invite_status: 'accepted' | 'pending' | 'expired' | string | null
  invitation_expires_at: string | null
}

export type UserManagementPagination = {
  total: number
  page: number
  limit: number
  has_more: boolean
}

export type UserManagementFilters = {
  organization_id?: string | null
  business_id?: string | null
  invitation_status_filter?: string | null
  user_status_filter?: string | null
  role_filter?: string | null
  search?: string | null
}

export type GetUsersData = {
  users: UserManagementUser[]
  pagination: UserManagementPagination
  filters_applied: UserManagementFilters
}

export type GetUsersResponse = BaseApiResponse<GetUsersData>

export type GetUsersParams = {
  page?: number
  limit?: number
  organization_id?: string
  business_id?: string
  invitation_status_filter?: string
  user_status_filter?: string
  role_filter?: string
  search?: string
}

export async function getUsers(params: GetUsersParams = {}) {
  const { data } = await api.get<GetUsersResponse>('/v1/user-management/users', { params })
  return data
}

export type InviteUserPayload = {
  email: string
  first_name: string
  last_name: string
  role_id?: string
  role?: string
  organization_id?: string
  business_id?: string
}

export type InviteUserData = {
  invitation_id: string
  user_id: string
  cognito_user_id: string
  user_created: boolean
  profile_created: boolean
  user_status: string
  email_sent: boolean
}

export type InviteUserResponse = BaseApiResponse<InviteUserData>

export async function inviteUser(payload: InviteUserPayload) {
  const { data } = await api.post<InviteUserResponse>('/v1/user-management/invite', payload)
  return data
}

// ------------------ CHANGE USER ROLE ------------------

export type ChangeUserRolePayload = {
  role_id: string
}

export type ChangeUserRoleData = {
  updated_fields: string[]
}

export type ChangeUserRoleResponse = BaseApiResponse<ChangeUserRoleData>

export async function changeUserRole(user_email: string, payload: ChangeUserRolePayload) {
  const { data } = await api.put<ChangeUserRoleResponse>(
    `/v1/user-management/users/${encodeURIComponent(user_email)}/role`,
    payload
  )
  return data
}

// ------------------ UPDATE USER ------------------

export type UpdateUserPayload = {
  first_name?: string
  last_name?: string
  is_active?: boolean
}

export type UpdateUserData = {
  updated_fields: string[]
}

export type UpdateUserResponse = BaseApiResponse<UpdateUserData>

export async function updateUserByEmail(user_email: string, payload: UpdateUserPayload) {
  const { data } = await api.put<UpdateUserResponse>(
    `/v1/user-management/users/${encodeURIComponent(user_email)}/edit`,
    payload
  )
  return data
}

export type DeleteUserData = {
  email: string
  deletion_type?: 'hard_delete' | 'soft_delete'
  user_was_active?: boolean
  had_pending_invitation?: boolean
  cognito_deleted?: boolean
  already_soft_deleted?: boolean
  can_force_purge?: boolean
}

export type DeleteUserResponse = BaseApiResponse<DeleteUserData>

export async function deleteUserByEmail(user_email: string, force = false) {
  const url = `/v1/user-management/users/${encodeURIComponent(user_email)}${
    force ? '?force=true' : ''
  }`
  const { data } = await api.delete<DeleteUserResponse>(url)
  return data
}

export type ResendInvitationData = {
  invitation_id: string
  email: string
  new_token: string
  expires_at: string
  email_sent: boolean
}

export type ResendInvitationResponse = BaseApiResponse<ResendInvitationData>

export async function resendInvitation(invitation_id: string) {
  const { data } = await api.post<ResendInvitationResponse>(
    `/v1/user-management/invitations/${encodeURIComponent(invitation_id)}/resend`
  )
  return data
}

// ------------------ PURGE INACTIVE USERS ------------------

export type PurgeFailure = {
  email: string
  reason: string
}

export type PurgeInactiveResult = {
  total: number
  succeeded: string[]
  failed: PurgeFailure[]
}

export type PurgeInactiveResponse = BaseApiResponse<PurgeInactiveResult>

/**
 * Hard-deletes every deactivated (is_deleted=True) user via a single
 * server-side endpoint. Backend processes each user inside its own SAVEPOINT
 * so partial failures don't abort the batch — the response carries
 * per-user succeeded/failed lists.
 *
 * Replaces the previous client-side fanout that paged through inactive
 * users and issued N parallel DELETEs (problems: no transaction boundary,
 * no backpressure, one round-trip per user, partial-failure state).
 */
export async function purgeInactiveUsers(): Promise<PurgeInactiveResult> {
  const { data } = await api.post<PurgeInactiveResponse>(
    '/v1/user-management/users/purge-inactive'
  )
  return (
    data.data ?? {
      total: 0,
      succeeded: [],
      failed: [],
    }
  )
}

/**
 * Fetches the count of inactive/deactivated users without deleting them.
 */
export async function getInactiveUserCount(): Promise<number> {
  const response = await getUsers({
    user_status_filter: 'inactive',
    limit: 1,
    page: 1,
  })
  return response?.data?.pagination?.total ?? 0
}
