import { api } from '@/lib/axios'
import { getToken } from '@/lib/storage'

export type CoachAudioParams = {
  accentId?: string
  toneIds?: string[]
  genderId?: string
}

export function buildCoachAudioPreviewUrl(params?: CoachAudioParams): string {
  const base = (api.defaults.baseURL as string) || (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || ""
  const url = new URL(`${base.replace(/\/+$/, '')}/v1/frontend-text/audio-preview`)
  if (params?.accentId) url.searchParams.set('accent_id', params.accentId)
  if (params?.genderId) url.searchParams.set('gender_id', params.genderId)
  if (params?.toneIds && params.toneIds.length > 0) url.searchParams.set('tone_ids', params.toneIds.join(','))
  return url.toString()
}

export async function fetchCoachAudioPcm(params?: CoachAudioParams, controller?: AbortController): Promise<ArrayBuffer> {
  const url = buildCoachAudioPreviewUrl(params)
  const headers: Record<string, string> = {}
  const token = await getToken().catch(() => null)
  if (token) headers['access-token'] = token as string
  const resp = await fetch(url, { method: 'GET', headers, signal: controller?.signal, credentials: 'include' })
  if (!resp.ok) throw new Error(`Failed to fetch audio: ${resp.status}`)
  return await resp.arrayBuffer()
}
