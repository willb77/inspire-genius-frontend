import { useQuery, keepPreviousData } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getAuditLogs,
  getAuditStats,
  type AuditLogListResponse,
  type AuditStatsResponse,
} from "@/services/audit/audit.service"
import type { AuditLogListParams } from "@/types/audit"

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

export function useAuditStats() {
  return useQuery<AuditStatsResponse, AxiosError>({
    queryKey: QK.stats(),
    queryFn: () => getAuditStats(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
