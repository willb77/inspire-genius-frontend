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
  deletion_type: 'hard_delete' | 'soft_delete' | string
  user_was_active: boolean
  had_pending_invitation: boolean
  cognito_deleted: boolean
}

export type DeleteUserResponse = BaseApiResponse<DeleteUserData>

export async function deleteUserByEmail(
  user_email: string,
  options: { force?: boolean } = {}
) {
  const { data } = await api.delete<DeleteUserResponse>(
    `/v1/user-management/users/${encodeURIComponent(user_email)}`,
    { params: options.force ? { force: true } : undefined }
  )
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

export type PurgeInactiveResult = {
  succeeded: string[]
  failed: string[]
  total: number
}

type PurgeFailureEntry = { email: string; reason: string }

type PurgeInactiveServerData = {
  succeeded: string[]
  failed: Array<string | PurgeFailureEntry>
  total: number
}

/**
 * Server-side purge of all inactive/deactivated users. Calls the
 * `POST /v1/user-management/users/purge-inactive` endpoint (P0-1 fix,
 * 2026-05-13) which iterates every `is_deleted=True` user and force-purges
 * them with Cognito disable + FK SET NULL safety.
 *
 * Falls back to the legacy client-side loop if the server endpoint is
 * unavailable (older backend deploys) so the UI degrades gracefully.
 */
export async function purgeInactiveUsers(): Promise<PurgeInactiveResult> {
  try {
    const { data } = await api.post<BaseApiResponse<PurgeInactiveServerData>>(
      '/v1/user-management/users/purge-inactive'
    )
    const payload = data?.data ?? { succeeded: [], failed: [], total: 0 }
    const failedEmails = (payload.failed ?? []).map((f) =>
      typeof f === 'string' ? f : f.email
    )
    return {
      succeeded: payload.succeeded ?? [],
      failed: failedEmails,
      total: payload.total ?? 0,
    }
  } catch (err) {
    // Fallback: legacy client-side loop with force=true. Useful while the
    // bulk endpoint is rolling out, and as a safety net if it 404s.
    const allInactiveEmails: string[] = []
    let currentPage = 1
    let hasMore = true

    while (hasMore) {
      const response = await getUsers({
        user_status_filter: 'inactive',
        limit: 50,
        page: currentPage,
      })
      const users = response?.data?.users ?? []
      for (const u of users) {
        allInactiveEmails.push(u.email)
      }
      hasMore = response?.data?.pagination?.has_more ?? false
      currentPage++
    }

    if (allInactiveEmails.length === 0) {
      // Re-throw the original error if there was nothing to fall back to
      throw err
    }

    const results = await Promise.allSettled(
      allInactiveEmails.map((email) =>
        deleteUserByEmail(email, { force: true })
      )
    )

    const succeeded: string[] = []
    const failed: string[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.status !== false) {
        succeeded.push(allInactiveEmails[index])
      } else {
        failed.push(allInactiveEmails[index])
      }
    })

    return {
      succeeded,
      failed,
      total: allInactiveEmails.length,
    }
  }
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
