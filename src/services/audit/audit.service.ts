import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type {
  AuditLogPayload,
  AuditLogListParams,
  AuditLogListData,
  AuditStatsData,
} from "@/types/audit"

export type AuditLogListResponse = BaseApiResponse<AuditLogListData>
export type AuditStatsResponse = BaseApiResponse<AuditStatsData>

export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  try {
    await api.post("/v1/audit/log", payload)
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
