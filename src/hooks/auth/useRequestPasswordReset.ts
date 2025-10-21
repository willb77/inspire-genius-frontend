import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { requestPasswordReset, type RequestPasswordResetPayload, type RequestPasswordResetResponse } from '@/services/auth/password.service'
import { toast } from 'sonner'

export function useRequestPasswordReset(
  options?: UseMutationOptions<RequestPasswordResetResponse, AxiosError, RequestPasswordResetPayload>
) {
  return useMutation<RequestPasswordResetResponse, AxiosError, RequestPasswordResetPayload>({
    mutationFn: (payload) => requestPasswordReset(payload),
    onSuccess: (data, variables, ctx) => {
      const ok = Boolean((data?.status ?? data?.success) === true)
      const msg = data?.message || (ok ? 'Password reset link sent' : 'Password reset request failed')
      if (ok) toast.success(msg)
      else toast.error(msg)
      if (options?.onSuccess) return options.onSuccess(data, variables, ctx)
    },
    onError: (error, variables, ctx) => {
      const msg = (error as AxiosError<{ message?: string }>)?.response?.data?.message || error.message || 'Request failed'
      toast.error(msg)
      if (options?.onError) return options.onError(error, variables, ctx)
    },
    ...options,
  })
}
