import { api } from "@/lib/axios"
import type {
  AuditLogPayload,
  AuditLogListParams,
  AuditLogListData,
  AuditStatsData,
} from "@/types/audit"

export type AuditLogResponse = { success?: boolean; message?: string }
export type AuditLogListResponse = { success?: boolean; data?: AuditLogListData }
export type AuditStatsResponse = { success?: boolean; data?: AuditStatsData }

export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  try {
    await api.post<AuditLogResponse>("/v1/audit/log", payload)
  } catch {
    // fire-and-forget — silent error handling
  }
}

export async function getAuditLogs(params: AuditLogListParams = {}): Promise<AuditLogListResponse> {
  const { data } = await api.get<AuditLogListResponse>("/v1/audit/logs", { params })
  return data
}

export async function getAuditStats(): Promise<AuditStatsResponse> {
  const { data } = await api.get<AuditStatsResponse>("/v1/audit/stats")
  return data
}
