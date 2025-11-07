import { api } from '@/lib/axios'
import type { ApiEnvelope } from '@/types/auth/api-types'

export type AcceptInvitationPayload = {
  invitation_token: string
  new_password: string
}

export type AcceptInvitationResponse = ApiEnvelope

export async function acceptInvitation(payload: AcceptInvitationPayload): Promise<AcceptInvitationResponse> {
  const res = await api.post<ApiEnvelope>('/v1/user-management/invitations/accept', payload)
  return res.data
}
