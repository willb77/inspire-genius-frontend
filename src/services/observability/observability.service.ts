import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type {
  ResponseObservability,
  SessionObservability,
  DashboardMetrics,
  ObservabilityExportFormat,
} from "@/types/observability"

export type GetResponseObservabilityResponse = BaseApiResponse<ResponseObservability>
export type GetSessionObservabilityResponse = BaseApiResponse<SessionObservability>
export type GetSessionResponsesResponse = BaseApiResponse<ResponseObservability[]>
export type GetDashboardMetricsResponse = BaseApiResponse<DashboardMetrics>

export async function getResponseObservability(messageId: string) {
  const { data } = await api.get<ResponseObservability>(
    `/v1/observability/responses/${messageId}`
  )
  return data
}

export async function getSessionObservability(sessionId: string) {
  const { data } = await api.get<SessionObservability>(
    `/v1/observability/sessions/${sessionId}`
  )
  return data
}

export async function getSessionResponses(
  sessionId: string,
  params: { limit?: number; offset?: number } = {}
) {
  const { data } = await api.get<ResponseObservability[]>(
    `/v1/observability/sessions/${sessionId}/responses`,
    { params }
  )
  return data
}

export async function getDashboardMetrics(params: { user_id?: string } = {}) {
  const { data } = await api.get<DashboardMetrics>(
    "/v1/observability/dashboard",
    { params }
  )
  return data
}

export async function exportResponse(
  messageId: string,
  format: ObservabilityExportFormat = "json"
) {
  const { data } = await api.get(
    `/v1/observability/export/response/${messageId}`,
    {
      params: { format },
      responseType: "blob",
    }
  )
  return data
}

export async function exportSession(
  sessionId: string,
  format: ObservabilityExportFormat = "json"
) {
  const { data } = await api.get(
    `/v1/observability/export/session/${sessionId}`,
    {
      params: { format },
      responseType: "blob",
    }
  )
  return data
}
