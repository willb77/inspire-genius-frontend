import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upgradeAssessment } from '@/services/prism/prism.service'
import type { UpgradeAssessmentRequest } from '@/types/prism/assessment-types'
import { toast } from 'sonner'

export function usePrismUpgrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpgradeAssessmentRequest) => upgradeAssessment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['prism-status', variables.assessmentId],
      })
      queryClient.invalidateQueries({ queryKey: ['prism-history'] })
      toast.success('Report upgrade initiated!')
    },
    onError: () => {
      toast.error('Failed to upgrade report.')
    },
  })
}
