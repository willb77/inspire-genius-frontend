import { useQuery, useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import {
  getResponseObservability,
  getSessionObservability,
  getSessionResponses,
  getDashboardMetrics,
  exportResponse,
  exportSession,
} from "@/services/observability/observability.service"
import type { ObservabilityExportFormat } from "@/types/observability"

const QK = {
  response: (messageId: string) => ["observability", "response", messageId] as const,
  session: (sessionId: string) => ["observability", "session", sessionId] as const,
  sessionResponses: (sessionId: string) =>
    ["observability", "session", sessionId, "responses"] as const,
  dashboard: (userId?: string) => ["observability", "dashboard", userId] as const,
}

export function useResponseObservability(messageId: string, enabled = true) {
  return useQuery({
    queryKey: QK.response(messageId),
    queryFn: () => getResponseObservability(messageId),
    enabled: enabled && !!messageId,
    staleTime: 30_000,
  })
}

export function useSessionObservability(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: QK.session(sessionId),
    queryFn: () => getSessionObservability(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30_000,
  })
}

export function useSessionResponses(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: QK.sessionResponses(sessionId),
    queryFn: () => getSessionResponses(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 30_000,
  })
}

export function useDashboardMetrics(userId?: string) {
  return useQuery({
    queryKey: QK.dashboard(userId),
    queryFn: () => getDashboardMetrics({ user_id: userId }),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useExportResponse() {
  return useMutation<Blob, AxiosError, { messageId: string; format: ObservabilityExportFormat }>({
    mutationFn: ({ messageId, format }) => exportResponse(messageId, format),
    onSuccess: (data, { messageId, format }) => {
      triggerDownload(data, `ig-obs-response-${messageId}.${format}`)
      toast.success("Response observability exported")
    },
    onError: () => {
      toast.error("Failed to export response observability")
    },
  })
}

export function useExportSession() {
  return useMutation<Blob, AxiosError, { sessionId: string; format: ObservabilityExportFormat }>({
    mutationFn: ({ sessionId, format }) => exportSession(sessionId, format),
    onSuccess: (data, { sessionId, format }) => {
      triggerDownload(data, `ig-obs-session-${sessionId}.${format}`)
      toast.success("Session observability exported")
    },
    onError: () => {
      toast.error("Failed to export session observability")
    },
  })
}
