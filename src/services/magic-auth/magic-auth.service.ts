import { magicAuthApi } from "@/lib/magicAuthAxios"
import type {
  RequestMagicLinkPayload,
  VerifyMagicLinkPayload,
  MagicAuthUser,
  RequestOtpPayload,
  VerifyOtpPayload,
} from "@/types/magic-auth"

type MagicAuthResponse<T = unknown> = { success?: boolean; message?: string; data?: T }

export async function requestMagicLink(payload: RequestMagicLinkPayload) {
  const { data } = await magicAuthApi.post<MagicAuthResponse>("/api/auth/request-magic-link", payload)
  return data
}

export async function verifyMagicLink(payload: VerifyMagicLinkPayload) {
  const { data } = await magicAuthApi.post<MagicAuthResponse<MagicAuthUser>>("/api/auth/verify-magic-link", payload)
  return data
}

export async function requestMagicOtp(payload: RequestOtpPayload) {
  const { data } = await magicAuthApi.post<MagicAuthResponse>("/api/auth/request-otp", payload)
  return data
}

export async function verifyMagicOtp(payload: VerifyOtpPayload) {
  const { data } = await magicAuthApi.post<MagicAuthResponse<MagicAuthUser>>("/api/auth/verify-otp", payload)
  return data
}

export async function getMagicAuthMe(token: string) {
  const { data } = await magicAuthApi.get<MagicAuthResponse<MagicAuthUser>>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function magicAuthLogout(token: string) {
  const { data } = await magicAuthApi.post<MagicAuthResponse>("/api/auth/logout", null, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function magicAuthRefreshToken(refreshToken: string) {
  const { data } = await magicAuthApi.post<MagicAuthResponse<{ access_token: string }>>("/api/auth/refresh-token", {
    refresh_token: refreshToken,
  })
  return data
}
