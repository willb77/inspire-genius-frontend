import { api } from "@/lib/axios"
import type { ApiEnvelope, LoginDataPayload } from "@/types/auth/api-types"
import type {
  RequestMagicLinkPayload,
  VerifyMagicLinkPayload,
} from "@/types/magic-auth"

export type RequestMagicLinkResponse = ApiEnvelope<{ email: string }>
export type VerifyMagicLinkResponse = ApiEnvelope<LoginDataPayload>

export async function requestMagicLink(payload: RequestMagicLinkPayload) {
  const { data } = await api.post<RequestMagicLinkResponse>(
    "/v1/magic-link/request",
    payload,
  )
  return data
}

export async function verifyMagicLink(payload: VerifyMagicLinkPayload) {
  const { data } = await api.post<VerifyMagicLinkResponse>(
    "/v1/magic-link/verify",
    payload,
  )
  return data
}
