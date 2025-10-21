import { api } from '@/lib/axios'

export type PreferenceItem = {
  agent_id: string
  tone_ids: string[]
  accent_id: string
  gender_id: string
}

export type SavePreferencesRequest = {
  preferences: PreferenceItem[]
}

export type SavePreferencesResponse<T = unknown> = {
  status?: boolean
  success?: boolean
  message?: string
  data?: T
}

export async function savePreferences(payload: SavePreferencesRequest) {
  const { data } = await api.post<SavePreferencesResponse>('/v1/agents-settings/preferences', payload)
  return data
}

export type UpdatePreferencesRequestBody = {
  tone_ids: string[]
  accent_id: string
  gender_id: string
}

export type UpdatePreferencesResponse<T = unknown> = SavePreferencesResponse<T>

export async function updatePreferences(agentId: string, body: UpdatePreferencesRequestBody) {
  const { data } = await api.put<UpdatePreferencesResponse>(`/v1/agents-settings/preferences/${agentId}`, body)
  return data
}
