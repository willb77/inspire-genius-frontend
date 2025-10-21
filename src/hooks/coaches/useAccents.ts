import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getAccents, type AgentSettingResponse } from '@/services/coaches/settings.service'

export function useAccents<T = unknown>(options?: UseQueryOptions<AgentSettingResponse<T>, AxiosError>) {
  return useQuery<AgentSettingResponse<T>, AxiosError>({
    queryKey: ['agent-settings', 'accent'],
    queryFn: () => getAccents<T>(),
    ...options,
  })
}
