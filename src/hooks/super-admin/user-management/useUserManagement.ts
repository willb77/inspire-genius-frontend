import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getUsers, type GetUsersParams, type GetUsersResponse } from '@/services/super-admin/user-management/user-management.service'

export function useUserManagement(
  params: GetUsersParams,
  options?: UseQueryOptions<GetUsersResponse, AxiosError>
) {
  return useQuery<GetUsersResponse, AxiosError>({
    queryKey: ['user-management', params],
    queryFn: () => getUsers(params),
    ...options,
  })
}