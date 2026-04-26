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
    valid_tts_providers: ['openai', 'google', 'aws_polly'],
    stt_updated_at: null,
    tts_updated_at: null,
    stt_updated_by: null,
    tts_updated_by: null,
  },
}

/**
 * Normalize a voice config response — the backend may return the data directly
 * (flat: `{stt_provider, tts_provider, ...}`) or wrapped in a BaseApiResponse
 * envelope (`{status, data: {stt_provider, ...}}`).  This helper ensures
 * the caller always receives the `VoiceConfigResponse` shape.
 */
function normalizeVoiceResponse(raw: Record<string, unknown>): VoiceConfigResponse {
  // Already in wrapped shape?
  if (raw.data && typeof raw.data === 'object' && 'stt_provider' in (raw.data as Record<string, unknown>)) {
    return raw as unknown as VoiceConfigResponse
  }
  // Flat shape — wrap it
  if ('stt_provider' in raw || 'tts_provider' in raw) {
    return {
      status: true,
      message: 'Voice configuration loaded',
      data: {
        stt_provider: (raw.stt_provider as string) || 'auto',
        tts_provider: (raw.tts_provider as string) || 'aws_polly',
        valid_stt_providers: (raw.valid_stt_providers as string[]) || ['openai', 'deepgram', 'aws_transcribe', 'auto'],
        valid_tts_providers: (raw.valid_tts_providers as string[]) || ['openai', 'google', 'aws_polly'],
        stt_updated_at: (raw.stt_updated_at as string) || null,
        tts_updated_at: (raw.tts_updated_at as string) || null,
        stt_updated_by: (raw.stt_updated_by as string) || null,
        tts_updated_by: (raw.tts_updated_by as string) || null,
      },
    }
  }
  // Unknown shape — return as-is and hope for the best
  return raw as unknown as VoiceConfigResponse
}

export async function getVoiceConfig(): Promise<VoiceConfigResponse> {
  // Try the API Gateway routed path first, fall back to legacy path,
  // then return a static default so the UI always renders
  try {
    const { data } = await api.get('/v1/agents/voice/config')
    return normalizeVoiceResponse(data as Record<string, unknown>)
  } catch {
    try {
      const { data } = await api.get('/v1/admin/voice-config')
      return normalizeVoiceResponse(data as Record<string, unknown>)
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
