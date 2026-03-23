import { useMutation, useQueryClient } from '@tanstack/react-query'
import { initiateAssessment } from '@/services/prism/prism.service'
import type { InitiateAssessmentRequest } from '@/types/prism/assessment-types'
import { toast } from 'sonner'

export function usePrismInitiate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InitiateAssessmentRequest) => initiateAssessment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prism-history'] })
      toast.success(
        'PRISM assessment initiated! Check your email for the questionnaire link.',
      )
    },
    onError: () => {
      toast.error('Failed to initiate PRISM assessment. Please try again.')
    },
  })
}
