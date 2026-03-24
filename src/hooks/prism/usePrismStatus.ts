import { useQuery } from '@tanstack/react-query'
import { getAssessmentStatus } from '@/services/prism/prism.service'
import { PRISM_POLL_INTERVAL } from '@/constants/prism'

/**
 * Polls assessment status. Automatically stops polling when status
 * reaches 'report_ready', 'ingested', or 'error'.
 */
export function usePrismStatus(assessmentId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['prism-status', assessmentId],
    queryFn: () => getAssessmentStatus(assessmentId!),
    enabled: enabled && !!assessmentId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      if (
        status === 'report_ready' ||
        status === 'ingested' ||
        status === 'error'
      ) {
        return false
      }
      return PRISM_POLL_INTERVAL
    },
  })
}
