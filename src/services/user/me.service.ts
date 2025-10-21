import { api } from '@/lib/axios'

export type MeResponse<T = unknown> = {
  status?: boolean
  success?: boolean
  message?: string
  data?: T
}

export async function getMe<T = unknown>() {
  const { data } = await api.get<MeResponse<T>>('/v1/me')
  return data
}
