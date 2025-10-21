import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getAgents, type AgentsQuery, type AgentsResponse } from '@/services/coaches/agents.service'

export function useAgents(query: AgentsQuery, options?: UseQueryOptions<AgentsResponse, AxiosError>) {
  return useQuery<AgentsResponse, AxiosError>({
    queryKey: ['agents', query.page, query.page_size],
    queryFn: () => getAgents(query),
    ...options,
  })
}
