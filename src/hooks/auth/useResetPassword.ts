import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { resetPassword, type ResetPasswordPayload, type ResetPasswordResponse } from '@/services/auth/password.service'
import { toast } from 'sonner'
import { logAuditEvent } from '@/services/audit/audit.service'

export function useResetPassword(
  options?: UseMutationOptions<ResetPasswordResponse, AxiosError, ResetPasswordPayload>
) {
  return useMutation<ResetPasswordResponse, AxiosError, ResetPasswordPayload>({
    mutationFn: (payload) => resetPassword(payload),
    onSuccess: (data, variables, ctx) => {
      const ok = Boolean((data?.status ?? data?.success) === true)
      const msg = data?.message || (ok ? 'Password reset successful' : 'Password reset failed')
      if (ok) {
        toast.success(msg)
        logAuditEvent({ action: "password_changed", actor_email: "user", target_type: "auth" })
      } else {
        toast.error(msg)
      }
      if (options?.onSuccess) return options.onSuccess(data, variables, ctx)
    },
    onError: (error, variables, ctx) => {
      const msg = (error as AxiosError<{ message?: string }>)?.response?.data?.message || error.message || 'Reset failed'
      toast.error(msg)
      if (options?.onError) return options.onError(error, variables, ctx)
    },
    ...options,
  })
}
