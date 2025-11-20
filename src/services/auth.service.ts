import { api } from '@/lib/axios'
import type { ApiEnvelope, LoginDataPayload } from '@/types/auth/api-types'

export type LoginPayload = {
  email: string
  password: string
  verification: boolean
  session?: string
  otp?: string
}

export async function loginApi(payload: LoginPayload) {
  const res = await api.post<ApiEnvelope<LoginDataPayload>>('/v1/login', payload)
  return res.data
}

export async function resendVerificationApi(email: string) {
  // Adjust to your backend: if it expects JSON body, send { email }.
  const res = await api.post<ApiEnvelope>(`/v1/resend-verification?email=${email}`)
  return res.data
}

export type SignupPayload = {
  email: string
  password: string
  confirm_password: string
}

export async function signupApi(payload: SignupPayload) {
  const res = await api.post<ApiEnvelope<LoginDataPayload>>('/v1/signup', payload)
  return res.data
}

export async function verifySignupApi(email: string, confirm_code: string) {
  const res = await api.post<ApiEnvelope>(`/v1/verify-signup?email=${encodeURIComponent(email)}&confirmation_code=${encodeURIComponent(confirm_code)}`)
  return res.data
}

// Social login helper: call /v1/me with a provided token without mutating global auth state
export async function getMeWithToken(token: string) {
  const res = await api.get<ApiEnvelope>("/v1/me", {
    headers: {
      "access-token": `${token}`,
    },
  })
  return res.data
}

// Social provider login URL generator
export async function getSocialAuthLoginUrl(provider: string) {
  const res = await api.get<ApiEnvelope<{ login_url: string }>>(
    `/v1/social-auth/login/?provider=${encodeURIComponent(provider)}`
  )
  return res.data
}
