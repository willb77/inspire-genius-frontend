import { auditApi } from "@/lib/auditAxios"
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
    await auditApi.post<AuditLogResponse>("/api/audit/log", payload)
  } catch {
    // fire-and-forget — silent error handling
  }
}

export async function getAuditLogs(params: AuditLogListParams = {}) {
  const { data } = await auditApi.get<AuditLogListResponse>("/api/audit/logs", { params })
  return data
}

export async function getAuditStats() {
  const { data } = await auditApi.get<AuditStatsResponse>("/api/audit/stats")
  return data
}
