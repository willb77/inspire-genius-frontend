import { useQuery, keepPreviousData } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getAuditLogs,
  getAuditStats,
  type AuditLogListResponse,
  type AuditStatsResponse,
} from "@/services/audit/audit.service"
import type { AuditLogListParams } from "@/types/audit"
import { useAuth } from "@/context/useAuth"

const QK = {
  list: (params: AuditLogListParams) => ["audit", "logs", params] as const,
  stats: () => ["audit", "stats"] as const,
}

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery<AuditLogListResponse, AxiosError>({
    queryKey: QK.list(params),
    queryFn: () => getAuditLogs(params),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  })
}

// /v1/audit/stats is gated to {super-admin, company-admin} on the backend
// (audit-service/app/routes.py:30 _AUDIT_READ_ROLES — exact set match, NOT
// hierarchical). Calling it as any other role logs a noisy 403 on every
// page load. Gate the query at the hook level so the request never fires
// for callers without permission; data is undefined for those roles,
// which the consuming components already handle.
export function useAuditStats() {
  const { hasRole } = useAuth()
  const enabled = hasRole("super-admin") || hasRole("company-admin")
  return useQuery<AuditStatsResponse, AxiosError>({
    queryKey: QK.stats(),
    queryFn: () => getAuditStats(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  })
}
