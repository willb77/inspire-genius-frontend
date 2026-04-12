import axios from "axios"
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

/**
 * Audit API uses the API Gateway directly (not the CloudFront proxy)
 * because the CloudFront origin doesn't route /v1/audit/* paths.
 */
const AUDIT_BASE_URL = import.meta.env.VITE_AUDIT_API_URL
  || "https://8umg6xioz5.execute-api.us-east-1.amazonaws.com"

const auditApi = axios.create({ baseURL: AUDIT_BASE_URL })

// Copy auth token from the main api instance for authenticated requests
auditApi.interceptors.request.use((config) => {
  const token = api.defaults.headers.common["access-token"]
  if (token) {
    config.headers["access-token"] = token
  }
  return config
})

export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  try {
    const url = `${AUDIT_BASE_URL}/v1/audit/log`
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, blob)
    } else {
      fetch(url, { method: "POST", body: blob, keepalive: true }).catch(() => {})
    }
  } catch {
    // fire-and-forget
  }
}

export async function getAuditLogs(params: AuditLogListParams = {}): Promise<AuditLogListResponse> {
  const { data } = await auditApi.get<AuditLogListResponse>("/v1/audit/logs", { params })
  return data
}

export async function getAuditStats(): Promise<AuditStatsResponse> {
  const { data } = await auditApi.get<AuditStatsResponse>("/v1/audit/stats")
  return data
}
