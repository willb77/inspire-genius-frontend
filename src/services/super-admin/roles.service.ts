import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'

export type RoleItem = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type GetRolesData = {
  roles: RoleItem[]
}

export type GetRolesResponse = BaseApiResponse<GetRolesData>

export async function getRoles() {
  const { data } = await api.get<GetRolesResponse>('/v1/rbac/roles')
  return data
}
