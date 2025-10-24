import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getDocumentTrend, type DocumentTrendResponse } from '@/services/super-admin/dashboard/document-trend.service'

export function useDocumentTrend(options?: UseQueryOptions<DocumentTrendResponse, AxiosError>) {
  return useQuery<DocumentTrendResponse, AxiosError>({
    queryKey: ['document-trend'],
    queryFn: () => getDocumentTrend(),
    ...options,
  })
}