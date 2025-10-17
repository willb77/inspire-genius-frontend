import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { loginApi } from '@/services/auth.service'
import type { ApiEnvelope, LoginDataPayload } from '@/types/auth/api-types'

type Vars = { email: string; password: string }
export type LoginMutationData = { data: ApiEnvelope<LoginDataPayload>; email: string; password: string }

export function useAuthLoginMutation(options?: UseMutationOptions<LoginMutationData, AxiosError, Vars>) {
  return useMutation<LoginMutationData, AxiosError, Vars>({
    mutationFn: async ({ email, password }) => {
      const res = await loginApi({ email, password, verification: false })
      return { data: res as ApiEnvelope<LoginDataPayload>, email, password }
    },
    ...options,
  })
}
