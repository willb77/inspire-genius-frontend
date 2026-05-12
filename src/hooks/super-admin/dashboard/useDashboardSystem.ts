import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getDashboardSystem, type DashboardSystemResponse } from '@/services/super-admin/dashboard/dashboard-system.service'

/**
 * `GET /v1/dashboard/system` has no backend implementation — it 404s against
 * the monolith catch-all on every call. Disabled by default until a real
 * backend exists. See IG_backlog.md #9 Bug A.
 *
 * To re-enable: remove `enabled: false` once the backend route is built, or
 * pass `enabled: true` in `options` for tests / specific consumers that
 * mock the service.
 */
export function useDashboardSystem(options?: Partial<UseQueryOptions<DashboardSystemResponse, AxiosError>>) {
  return useQuery<DashboardSystemResponse, AxiosError>({
    queryKey: ['dashboard-system'],
    queryFn: () => getDashboardSystem(),
    enabled: false,
    ...options,
  })
}