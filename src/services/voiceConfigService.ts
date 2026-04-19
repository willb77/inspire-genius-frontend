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

/** Default voice config returned when both API endpoints are unavailable */
const FALLBACK_VOICE_CONFIG: VoiceConfigResponse = {
  status: true,
  message: 'Using default voice configuration (API unavailable)',
  data: {
    stt_provider: 'auto',
    tts_provider: 'aws_polly',
    valid_stt_providers: ['openai', 'deepgram', 'aws_transcribe', 'auto'],
    valid_tts_providers: ['openai', 'google', 'elevenlabs', 'aws_polly'],
    stt_updated_at: null,
    tts_updated_at: null,
    stt_updated_by: null,
    tts_updated_by: null,
  },
}

export async function getVoiceConfig(): Promise<VoiceConfigResponse> {
  // Try the API Gateway routed path first, fall back to legacy path,
  // then return a static default so the UI always renders
  try {
    const { data } = await api.get<VoiceConfigResponse>('/v1/agents/voice/config')
    return data
  } catch {
    try {
      const { data } = await api.get<VoiceConfigResponse>('/v1/admin/voice-config')
      return data
    } catch {
      // Both endpoints failed — return static defaults
      return FALLBACK_VOICE_CONFIG
    }
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
