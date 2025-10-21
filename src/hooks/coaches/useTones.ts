import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getTones, type AgentSettingResponse } from '@/services/coaches/settings.service'

export function useTones<T = unknown>(options?: UseQueryOptions<AgentSettingResponse<T>, AxiosError>) {
  return useQuery<AgentSettingResponse<T>, AxiosError>({
    queryKey: ['agent-settings', 'tone'],
    queryFn: () => getTones<T>(),
    ...options,
  })
}
