import { api } from '@/lib/axios'

export type CreateProfilePayload = {
  first_name: string
  last_name: string
  date_of_birth: string // yyyy-mm-dd
  additional_info?: string
  role_id?: string
}

export type CreateProfileResponse = {
  status?: boolean
  success?: boolean
  message?: string
  data?: unknown
}

export async function createProfile(payload: CreateProfilePayload): Promise<CreateProfileResponse> {
  const { data } = await api.post<CreateProfileResponse>('/v1/onboarding/profile', payload)
  return data
}

export async function updateProfile(payload: CreateProfilePayload): Promise<CreateProfileResponse> {
  const { data } = await api.put<CreateProfileResponse>('/v1/onboarding/profile', payload)
  return data
}
