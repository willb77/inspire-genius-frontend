import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getMe, type MeResponse } from '@/services/user/me.service'

export function useMe<T = unknown>(options?: UseQueryOptions<MeResponse<T>, AxiosError>) {
  return useQuery<MeResponse<T>, AxiosError>({
    queryKey: ['me'],
    queryFn: () => getMe<T>(),
    ...options,
  })
}
