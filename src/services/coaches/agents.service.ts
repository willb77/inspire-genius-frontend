import { getApi } from '@/lib/agentApi'

export type AgentsQuery = {
  page: number
  page_size: number
}

export type AgentsResponse<T = unknown> = {
  status?: boolean
  success?: boolean
  message?: string
  data?: T
}

export async function getAgents(params: AgentsQuery) {
  const { data } = await getApi().get<AgentsResponse>(
    `/v1/agents-settings/agents`,
    { params }
  )
  return data
}
