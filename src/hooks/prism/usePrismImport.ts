import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importPrismFile } from '@/services/prism/prism.service'
import { toast } from 'sonner'

interface ImportPrismParams {
  userId: string
  file: File
}

export function usePrismImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, file }: ImportPrismParams) =>
      importPrismFile(userId, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prism-history'] })
      const scores = data.parsed_scores
      toast.success(
        `PRISM report imported — Gold: ${scores?.gold ?? 0}, Green: ${scores?.green ?? 0}, Blue: ${scores?.blue ?? 0}, Orange: ${scores?.orange ?? 0}`,
      )
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      const detail = error.response?.data?.detail ?? error.message
      toast.error(`Import failed: ${detail}`)
    },
  })
}
