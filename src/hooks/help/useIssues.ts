import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getIssues, type GetIssuesResponse } from '@/services/help/issues.service'

export function useIssues(params: { page: number; page_size: number }, options?: UseQueryOptions<GetIssuesResponse, AxiosError>) {
  return useQuery<GetIssuesResponse, AxiosError>({
    queryKey: ['issues', {page: params.page, page_size: params.page_size}],
    queryFn: () => getIssues(params),
    ...options,
  })
}
