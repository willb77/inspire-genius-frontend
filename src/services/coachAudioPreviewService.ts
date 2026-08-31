import { api } from '@/lib/axios'
import { getToken } from '@/lib/storage'

export type CoachAudioParams = {
  accentId?: string
  toneIds?: string[]
  genderId?: string
}

export function buildCoachAudioPreviewUrl(params?: CoachAudioParams): string {
  // Plain `import.meta.env.X`, NOT a cast. `jest.vite-env-transform.ts` rewrites
  // `import.meta.env.X` → `process.env.X` for Jest's CJS runtime by matching the
  // MetaProperty node; casting `import.meta` wraps it in an AsExpression, the
  // match fails silently, and the untransformed `import.meta` reaches the CJS
  // runtime as "SyntaxError: Cannot use 'import.meta' outside a module".
  //
  // That was latent until 2026-08-06 — nothing under test imported this service
  // until CoachesV2 became the default surface, at which point four
  // route-integration tests failed on a file nobody had touched. `vite/client`
  // is in the tsconfig types, so the cast bought nothing.
  const base = (api.defaults.baseURL as string) || import.meta.env.VITE_API_BASE_URL || ""
  const stripTrailingSlashes = (s: string) => {
    let end = s.length
    while (end > 0 && s.charCodeAt(end - 1) === 47) end -= 1
    return end === s.length ? s : s.slice(0, end)
  }
  const baseClean = stripTrailingSlashes(String(base || ""))
  const url = new URL(`${baseClean}/v1/frontend-text/audio-preview`)
  if (params?.accentId) url.searchParams.set('accent_id', params.accentId)
  if (params?.genderId) url.searchParams.set('gender_id', params.genderId)
  if (params?.toneIds && params.toneIds.length > 0) {
    const list = params.toneIds.filter((v): v is string => !!v && v.trim().length > 0)
    for (const id of list) url.searchParams.append('tone_ids', id)
  }
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
