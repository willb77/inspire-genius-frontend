import { agentApi, getApi } from '@/lib/agentApi'

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
  // Agent settings only exist on the Agent Engine (not the monolith).
  // Always use agentApi regardless of toggle to avoid "no agents" when toggle is OFF.
  try {
    const { data } = await agentApi.get<AgentsResponse>(
      `/v1/agents-settings/agents`,
      { params }
    )
    return data
  } catch {
    // Fallback to toggle-based routing
    const { data } = await getApi().get<AgentsResponse>(
      `/v1/agents-settings/agents`,
      { params }
    )
    return data
  }
}
