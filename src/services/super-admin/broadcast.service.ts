/**
 * Broadcast Alert service — raw Axios calls to the broadcast-service
 * (/v1/broadcasts/*). Composer/admin endpoints; super-admin allowlist gated
 * server-side. Returns the raw JSON shapes the service emits (no envelope).
 */
import { api } from "@/lib/axios"
import type {
  AccessInfo,
  AdminEntry,
  AudiencePreview,
  AudienceSpec,
  Broadcast,
  BroadcastCreatePayload,
} from "@/types/broadcast"

export async function getBroadcastAccess(): Promise<AccessInfo> {
  const { data } = await api.get<AccessInfo>("/v1/broadcasts/access/me")
  return data
}

export async function listBroadcastAdmins(): Promise<AdminEntry[]> {
  const { data } = await api.get<AdminEntry[]>("/v1/broadcasts/admins")
  return data
}

export async function addBroadcastAdmin(email: string): Promise<AdminEntry[]> {
  const { data } = await api.post<AdminEntry[]>("/v1/broadcasts/admins", { email })
  return data
}

export async function removeBroadcastAdmin(email: string): Promise<AdminEntry[]> {
  const { data } = await api.delete<AdminEntry[]>(`/v1/broadcasts/admins/${encodeURIComponent(email)}`)
  return data
}

export async function previewAudience(audience: AudienceSpec): Promise<AudiencePreview> {
  const { data } = await api.post<AudiencePreview>("/v1/broadcasts/audience/preview", audience)
  return data
}

export async function sendBroadcast(payload: BroadcastCreatePayload): Promise<Broadcast> {
  const { data } = await api.post<Broadcast>("/v1/broadcasts", payload)
  return data
}

export async function listBroadcasts(limit = 50): Promise<Broadcast[]> {
  const { data } = await api.get<Broadcast[]>("/v1/broadcasts", { params: { limit } })
  return data
}
