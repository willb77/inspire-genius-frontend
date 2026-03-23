import { useQuery } from '@tanstack/react-query'
import { getAssessmentReport } from '@/services/prism/prism.service'

export function usePrismReport(assessmentId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['prism-report', assessmentId],
    queryFn: () => getAssessmentReport(assessmentId!),
    enabled: enabled && !!assessmentId,
    staleTime: 5 * 60 * 1000,
  })
}
