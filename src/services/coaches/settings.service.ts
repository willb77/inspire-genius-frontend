import { getApi } from '@/lib/agentApi'

export type AgentSettingResponse<T = unknown> = {
  status?: boolean
  success?: boolean
  message?: string
  data?: T
}

export async function getAgentSetting<T = unknown>(segment: 'tone' | 'accent' | 'gender' | string) {
  const { data } = await getApi().get<AgentSettingResponse<T>>(`/v1/agents-settings/${segment}`)
  return data
}

export async function getTones<T = unknown>() {
  return getAgentSetting<T>('tone')
}

export async function getAccents<T = unknown>() {
  return getAgentSetting<T>('accent')
}

export async function getGenders<T = unknown>() {
  return getAgentSetting<T>('gender')
}
