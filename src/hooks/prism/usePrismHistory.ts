import { useQuery } from '@tanstack/react-query'
import { getUserAssessments } from '@/services/prism/prism.service'

export function usePrismHistory(userId: string | null) {
  return useQuery({
    queryKey: ['prism-history', userId],
    queryFn: () => getUserAssessments(userId!),
    enabled: !!userId,
  })
}
