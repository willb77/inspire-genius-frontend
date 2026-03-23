import { useMutation, useQueryClient } from '@tanstack/react-query'
import { unlockAssessment } from '@/services/prism/prism.service'
import type { UnlockAssessmentRequest } from '@/types/prism/assessment-types'
import { toast } from 'sonner'

export function usePrismUnlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UnlockAssessmentRequest) => unlockAssessment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['prism-status', variables.assessmentId],
      })
      queryClient.invalidateQueries({ queryKey: ['prism-history'] })
      toast.success('Report unlocked! Your PRISM report is being prepared.')
    },
    onError: () => {
      toast.error('Failed to unlock report. Please try again.')
    },
  })
}
