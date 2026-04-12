import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'

export type VoiceConfigData = {
  stt_provider: string
  tts_provider: string
  valid_stt_providers: string[]
  valid_tts_providers: string[]
  stt_updated_at: string | null
  tts_updated_at: string | null
  stt_updated_by: string | null
  tts_updated_by: string | null
}

export type VoiceConfigUpdate = {
  stt_provider?: string
  tts_provider?: string
}

export type VoiceConfigResponse = BaseApiResponse<VoiceConfigData>
export type VoiceConfigUpdateResponse = BaseApiResponse<{
  updated_keys: string[]
  stt_provider: string | null
  tts_provider: string | null
}>

export async function getVoiceConfig(): Promise<VoiceConfigResponse> {
  // Try the API Gateway routed path first, fall back to legacy path
  try {
    const { data } = await api.get<VoiceConfigResponse>('/v1/agents/voice/config')
    return data
  } catch {
    const { data } = await api.get<VoiceConfigResponse>('/v1/admin/voice-config')
    return data
  }
}

export async function updateVoiceConfig(payload: VoiceConfigUpdate): Promise<VoiceConfigUpdateResponse> {
  try {
    const { data } = await api.put<VoiceConfigUpdateResponse>('/v1/agents/voice/config', payload)
    return data
  } catch {
    const { data } = await api.put<VoiceConfigUpdateResponse>('/v1/admin/voice-config', payload)
    return data
  }
}
