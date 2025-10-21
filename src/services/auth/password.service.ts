import { api } from '@/lib/axios'

export type RequestPasswordResetPayload = { email: string }
export type RequestPasswordResetResponse = {
  status?: boolean
  success?: boolean
  message?: string
  data?: unknown
}

export async function requestPasswordReset(payload: RequestPasswordResetPayload): Promise<RequestPasswordResetResponse> {
  const { data } = await api.post<RequestPasswordResetResponse>('/v1/request-password-reset', payload)
  return data
}

export type ResetPasswordPayload = {
  reset_token: string
  new_password: string
  confirm_password: string
}

export type ResetPasswordResponse = {
  status?: boolean
  success?: boolean
  message?: string
  data?: unknown
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  const { data } = await api.post<ResetPasswordResponse>('/v1/reset-password', payload)
  return data
}
