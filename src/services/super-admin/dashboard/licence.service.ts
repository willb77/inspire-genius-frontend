import { api } from '@/lib/axios'

export type License = {
  id: string
  organization_id: string
  organization_name: string
  subscription_tier: string
  start_date: string
  end_date: string
  status: string
  is_expiring_soon: boolean
  days_until_expiry: number
  created_at: string
  updated_at: string
}

export type LicensesResponse = {
  message?: string
  status?: boolean
  data?: {
    licenses: License[]
    total: number
    page: number
    limit: number
  }
}

export async function getLicenses(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 10
  const { data } = await api.get<LicensesResponse>('/v1/licenses/', { params: { page, limit } })
  return data
}