import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getLicenses, type LicensesResponse } from '@/services/super-admin/dashboard/licence.service'

type Params = { page?: number; limit?: number }

export function useLicence(params?: Params, options?: UseQueryOptions<LicensesResponse, AxiosError>) {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 10

  return useQuery<LicensesResponse, AxiosError>({
    queryKey: ['licenses', { page, limit }],
    queryFn: () => getLicenses({ page, limit }),
    ...options,
  })
}