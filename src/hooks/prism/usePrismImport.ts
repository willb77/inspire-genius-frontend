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
    onSuccess: (data: { score_count?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['prism-history'] })
      // The import endpoint returns AdminAssessmentCreated (score_count), not a
      // parsed-colours object — the old toast always read undefined and showed
      // "Gold: 0, Green: 0…" on every successful import.
      const n = data?.score_count
      toast.success(
        typeof n === 'number'
          ? `PRISM report imported — ${n} scores added.`
          : 'PRISM report imported.',
      )
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      const detail = error.response?.data?.detail ?? error.message
      toast.error(`Import failed: ${detail}`)
    },
  })
}
