import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getAgentSetting, type AgentSettingResponse } from '@/services/coaches/settings.service'

export function useAgentSetting<T = unknown>(segment: string, options?: UseQueryOptions<AgentSettingResponse<T>, AxiosError>) {
  return useQuery<AgentSettingResponse<T>, AxiosError>({
    queryKey: ['agent-settings', segment],
    queryFn: () => getAgentSetting<T>(segment),
    ...options,
  })
}
