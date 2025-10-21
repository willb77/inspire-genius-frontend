import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getGenders, type AgentSettingResponse } from '@/services/coaches/settings.service'

export function useGenders<T = unknown>(options?: UseQueryOptions<AgentSettingResponse<T>, AxiosError>) {
  return useQuery<AgentSettingResponse<T>, AxiosError>({
    queryKey: ['agent-settings', 'gender'],
    queryFn: () => getGenders<T>(),
    ...options,
  })
}
