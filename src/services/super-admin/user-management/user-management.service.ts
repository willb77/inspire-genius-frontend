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

export async function deleteUserByEmail(user_email: string) {
  const { data } = await api.delete<DeleteUserResponse>(
    `/v1/user-management/users/${encodeURIComponent(user_email)}`
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

/**
 * Fetches all inactive/deactivated users and deletes them one by one
 * using the existing per-user delete endpoint.
 */
export async function purgeInactiveUsers(): Promise<PurgeInactiveResult> {
  // First, fetch all inactive users (page through if necessary)
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
    return { succeeded: [], failed: [], total: 0 }
  }

  // Delete each inactive user using the existing endpoint
  const results = await Promise.allSettled(
    allInactiveEmails.map((email) => deleteUserByEmail(email))
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
