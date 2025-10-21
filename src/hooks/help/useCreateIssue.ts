import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { createIssue, type CreateIssueResponse } from '@/services/help/issues.service'
import { toast } from 'sonner'

export function useCreateIssue(options?: UseMutationOptions<CreateIssueResponse, AxiosError, FormData>) {
  // const qc = useQueryClient()
  return useMutation<CreateIssueResponse, AxiosError, FormData>({
    mutationFn: (form) => createIssue(form),
    onSuccess: async (data, variables, ctx) => {
      const msg = data?.message || 'Issue submitted successfully'
      toast.success(msg)
      if (options?.onSuccess) return options.onSuccess(data, variables, ctx)
    },
    onError: (err, variables, ctx) => {
      const ax = err as AxiosError<{ message?: string }>
      const msg = ax?.response?.data?.message || (err as Error).message || 'Failed to submit issue'
      toast.error(msg)
      if (options?.onError) return options.onError(err, variables, ctx)
    },
    ...options,
  })
}
