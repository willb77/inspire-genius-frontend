import { api } from '@/lib/axios'

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
  const { data } = await api.get<AgentsResponse>(
    `/v1/agents-settings/agents`,
    { params }
  )
  return data
}
