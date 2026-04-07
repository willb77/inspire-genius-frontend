import { useQuery } from '@tanstack/react-query'
import { getFrontendText, type FrontendTextResponse } from '@/services/frontend-text.service'

export function useFrontendText() {
  return useQuery<FrontendTextResponse>({
    queryKey: ['frontend-text'],
    queryFn: () => getFrontendText().catch(() => ({ data: { items: [] } })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
