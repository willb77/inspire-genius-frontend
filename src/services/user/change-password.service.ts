import { api } from '@/lib/axios'

export type ChangePasswordRequest = {
  current_password: string
  new_password: string
  confirm_password: string
}

export type ChangePasswordResponse<T = unknown> = {
  status?: boolean
  success?: boolean
  message?: string
  data?: T
}

export async function changePassword(payload: ChangePasswordRequest) {
  const { data } = await api.post<ChangePasswordResponse>('/v1/change-password', payload)
  return data
}
