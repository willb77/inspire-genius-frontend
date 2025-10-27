import { api } from '@/lib/axios'

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

export type GetUsersResponse = {
  message?: string
  status?: boolean
  error_status?: {
    error_code?: string
    description?: string
  }
  data?: {
    users: UserManagementUser[]
    pagination: UserManagementPagination
    filters_applied: UserManagementFilters
  }
}

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
  const { data } = await api.get<GetUsersResponse>('/v1/user-management/users', {
    params,
  })
  return data
}

// Invite user API
export type InviteUserPayload = {
  email: string
  first_name: string
  last_name: string
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

export type InviteUserResponse = {
  message?: string
  status?: boolean
  error_status?: {
    error_code?: string
    description?: string
  }
  data?: InviteUserData
}

export async function inviteUser(payload: InviteUserPayload) {
  const { data } = await api.post<InviteUserResponse>('/v1/user-management/invite', payload)
  return data
}

// Update user by email API
export type UpdateUserPayload = {
  first_name: string
  last_name: string
}

export type UpdateUserResponse = {
  message?: string
  status?: boolean
  error_status?: {
    error_code?: string
    description?: string
  }
  data?: {
    updated_fields: string[]
  }
}

export async function updateUserByEmail(user_email: string, payload: UpdateUserPayload) {
  const { data } = await api.put<UpdateUserResponse>(
    `/v1/user-management/users/${encodeURIComponent(user_email)}/edit`,
    payload
  )
  return data
}

// Delete user by email API
export type DeleteUserResponse = {
  message?: string
  status?: boolean
  error_status?: {
    error_code?: string
    description?: string
  }
  data?: {
    email: string
    deletion_type: 'hard_delete' | 'soft_delete' | string
    user_was_active: boolean
    had_pending_invitation: boolean
    cognito_deleted: boolean
  }
}

export async function deleteUserByEmail(user_email: string) {
  const { data } = await api.delete<DeleteUserResponse>(
    `/v1/user-management/users/${encodeURIComponent(user_email)}`
  )
  return data
}

// Resend invitation API
export type ResendInvitationResponse = {
  message?: string
  status?: boolean
  error_status?: {
    error_code?: string
    description?: string
  }
  data?: {
    invitation_id: string
    email: string
    new_token: string
    expires_at: string
    email_sent: boolean
  }
}

export async function resendInvitation(invitation_id: string) {
  const { data } = await api.post<ResendInvitationResponse>(
    `/v1/user-management/invitations/${encodeURIComponent(invitation_id)}/resend`
  )
  return data
}
