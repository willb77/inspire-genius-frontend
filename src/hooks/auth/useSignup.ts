import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { signupApi } from '@/services/auth.service'
import type { ApiEnvelope, LoginDataPayload } from '@/types/auth/api-types'

type Vars = { email: string; password: string; confirmPassword: string }
export type SignupMutationData = { data: ApiEnvelope<LoginDataPayload>; email: string; password: string }

export function useAuthSignupMutation(options?: UseMutationOptions<SignupMutationData, AxiosError, Vars>) {
  return useMutation<SignupMutationData, AxiosError, Vars>({
    mutationFn: async ({ email, password, confirmPassword }) => {
      const res = await signupApi({ email, password, confirm_password: confirmPassword })
      return { data: res as ApiEnvelope<LoginDataPayload>, email, password }
    },
    ...options,
  })
}
