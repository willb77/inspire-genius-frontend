import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import type { ApiEnvelope } from '@/types/auth/api-types'
import { getEmail } from '@/lib/storage'
import { resendVerificationApi } from '@/services/auth.service'

export function useResendOtpMutation(options?: UseMutationOptions<ApiEnvelope, AxiosError, void>) {
  return useMutation<ApiEnvelope, AxiosError, void>({
    mutationFn: async () => {
      const email = await getEmail()
      const res = await resendVerificationApi(email as string)
      return res
    },
    ...options,
  })
}
