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
    // Use sendBeacon for truly silent fire-and-forget (no console errors)
    const baseUrl = (api.defaults.baseURL ?? "").replace(/\/$/, "")
    const url = `${baseUrl}/v1/audit/log`
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, blob)
    } else {
      // Fallback to fetch with keepalive
      fetch(url, {
        method: "POST",
        body: blob,
        keepalive: true,
      }).catch(() => {})
    }
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
