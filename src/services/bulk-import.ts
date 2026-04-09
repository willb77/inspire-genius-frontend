import { api } from "@/lib/axios"
import type {
  BulkUserRecord,
  BulkImportResponse,
  BulkImportStatusResponse,
  SendBulkInvitationsPayload,
  SendBulkResponse,
  InvitationStatusResponse,
} from "@/types/bulk-import"

export async function bulkImportUsers(records: BulkUserRecord[]) {
  const res = await api.post<BulkImportResponse>("/api/v1/users/bulk-import", {
    users: records,
  })
  return res.data
}

export async function getBulkImportStatus(batchId: string) {
  const res = await api.get<BulkImportStatusResponse>(
    `/api/v1/users/bulk-import/${batchId}`,
  )
  return res.data
}

export async function sendBulkInvitations(payload: SendBulkInvitationsPayload) {
  const res = await api.post<SendBulkResponse>(
    "/api/v1/invitations/send-bulk",
    payload,
  )
  return res.data
}

export async function getInvitationStatus(batchId: string) {
  const res = await api.get<InvitationStatusResponse>(
    `/api/v1/invitations/status/${batchId}`,
  )
  return res.data
}

export async function resendInvitation(inviteId: string) {
  const res = await api.post(`/api/v1/invitations/resend/${inviteId}`)
  return res.data
}
