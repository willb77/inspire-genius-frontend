import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import type { ApiEnvelope, LoginDataPayload } from '@/types/auth/api-types'
import { loginApi, verifySignupApi } from '@/services/auth.service'
import { getEmail, getPassword, getSession, getNextStep } from '@/lib/storage'
import { NEXT_STEPS } from '@/constants/routes'

type Vars = { otp: string }
export type VerifyEmailData = { mode: 'verify_email'; data: ApiEnvelope; email: string; password: string }
export type VerifyMfaData = { mode: 'verify_mfa'; data: ApiEnvelope<LoginDataPayload>; email: string }
export type VerifyOtpMutationData = VerifyEmailData | VerifyMfaData

export function useAuthVerifyOtpMutation(options?: UseMutationOptions<VerifyOtpMutationData, AxiosError, Vars>) {
  return useMutation<VerifyOtpMutationData, AxiosError, Vars>({
    mutationFn: async ({ otp }) => {
      const [email, password, session, step] = await Promise.all([
        getEmail(),
        getPassword(),
        getSession(),
        getNextStep(),
      ])
      if (step === NEXT_STEPS.VERIFY_EMAIL) {
        const res = await verifySignupApi(email as string, otp)
        return { mode: 'verify_email', data: res as ApiEnvelope, email: email as string, password: (password as string) ?? '' }
      }
      const res = await loginApi({
        email: email as string,
        password: (password as string) ?? '',
        verification: true,
        session: session ?? undefined,
        otp,
      })
      return { mode: 'verify_mfa', data: res as ApiEnvelope<LoginDataPayload>, email: email as string }
    },
    ...options,
  })
}
