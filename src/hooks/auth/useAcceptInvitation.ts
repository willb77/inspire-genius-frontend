import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { acceptInvitation, type AcceptInvitationPayload, type AcceptInvitationResponse } from '@/services/auth/invitation.service'
import { toast } from 'sonner'

export function useAcceptInvitation(
  options?: UseMutationOptions<AcceptInvitationResponse, AxiosError, AcceptInvitationPayload>
) {
  return useMutation<AcceptInvitationResponse, AxiosError, AcceptInvitationPayload>({
    mutationFn: (payload) => acceptInvitation(payload),
    onSuccess: (data, variables, ctx) => {
      const ok = Boolean((data?.status ?? data?.success) === true)
      const msg = data?.message || (ok ? 'Invitation accepted' : 'Failed to accept invitation')
      if (ok) toast.success(msg)
      else toast.error(msg)
      if (ok && options?.onSuccess) return options.onSuccess(data, variables, ctx)
    },
    onError: (error, variables, ctx) => {
      const msg = (error as AxiosError<{ message?: string }>)?.response?.data?.message || error.message || 'Failed to accept invitation'
      toast.error(msg)
      if (options?.onError) return options.onError(error, variables, ctx)
    },
    ...options,
  })
}
