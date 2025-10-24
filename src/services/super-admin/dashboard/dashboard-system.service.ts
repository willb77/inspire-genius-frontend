import { api } from '@/lib/axios'

export type OrganizationStatistics = {
  total: number
  active: number
  inactive: number
}

export type BusinessStatistics = {
  total: number
  active: number
  inactive: number
  by_type: {
    corporate: number
    education: number
  }
}

export type DashboardSystemResponse = {
  message?: string
  status?: boolean
  data?: {
    organization_statistics: OrganizationStatistics
    business_statistics: BusinessStatistics
  }
}

export async function getDashboardSystem() {
  const { data } = await api.get<DashboardSystemResponse>('/v1/dashboard/system')
  return data
}