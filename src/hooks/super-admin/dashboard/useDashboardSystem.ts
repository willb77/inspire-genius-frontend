import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getDashboardSystem, type DashboardSystemResponse } from '@/services/super-admin/dashboard/dashboard-system.service'

export function useDashboardSystem(options?: UseQueryOptions<DashboardSystemResponse, AxiosError>) {
  return useQuery<DashboardSystemResponse, AxiosError>({
    queryKey: ['dashboard-system'],
    queryFn: () => getDashboardSystem(),
    ...options,
  })
}