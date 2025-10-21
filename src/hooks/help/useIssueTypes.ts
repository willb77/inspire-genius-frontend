import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getIssueTypes, type GetIssueTypesResponse } from '@/services/help/issues.service'

export function useIssueTypes() {
  return useQuery<GetIssueTypesResponse, AxiosError>({
    queryKey: ['issue-types'],
    queryFn: () => getIssueTypes(),
    staleTime: 5 * 60 * 1000,
  })
}
