import { api } from '@/lib/axios'

export type FrontendTextItem = {
  key: string
  value: string
}

export type FrontendTextResponse = {
  status?: boolean
  success?: boolean
  message?: string
  data?: {
    items?: FrontendTextItem[] | Record<string, string>
    [k: string]: unknown
  }
}

export async function getFrontendText() {
  const res = await api.get<FrontendTextResponse>('/v1/frontend-text')
  return res.data
}
