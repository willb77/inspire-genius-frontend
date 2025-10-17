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
