import { api } from '@/lib/axios'

export type DocumentTrendItem = {
  category_id: string
  category_name: string
  file_count: number
  display_name: string
}

export type DocumentTrendResponse = {
  message?: string
  status?: boolean
  data?: DocumentTrendItem[]
}

export async function getDocumentTrend() {
  const { data } = await api.get<DocumentTrendResponse>('/v1/dashboard/documents/count')
  return data
}