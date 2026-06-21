import axios from "axios"
import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type {
  ResponseObservability,
  SessionObservability,
  DashboardMetrics,
  ObservabilityExportFormat,
  OrgRollups,
} from "@/types/observability"

export type GetResponseObservabilityResponse = BaseApiResponse<ResponseObservability>
export type GetSessionObservabilityResponse = BaseApiResponse<SessionObservability>
export type GetSessionResponsesResponse = BaseApiResponse<ResponseObservability[]>
export type GetDashboardMetricsResponse = BaseApiResponse<DashboardMetrics>

// A 404 from /v1/observability/* means "no record yet" — the analytics
// writer side isn't populating these tables. Treat 404 as a successful
// empty result so the React Query hook's `isError` stays false and the
// drawer renders its empty state instead of PR #53's error toast.
function isNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404
}

export async function getResponseObservability(messageId: string) {
  try {
    const { data } = await api.get<ResponseObservability>(
      `/v1/observability/responses/${messageId}`
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function getSessionObservability(sessionId: string) {
  try {
    const { data } = await api.get<SessionObservability>(
      `/v1/observability/sessions/${sessionId}`
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

export async function getSessionResponses(
  sessionId: string,
  params: { limit?: number; offset?: number } = {}
) {
  try {
    const { data } = await api.get<ResponseObservability[]>(
      `/v1/observability/sessions/${sessionId}/responses`,
      { params }
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return []
    throw err
  }
}

export async function getDashboardMetrics(params: { user_id?: string } = {}) {
  const { data } = await api.get<DashboardMetrics>(
    "/v1/observability/dashboard",
    { params }
  )
  return data
}

/**
 * Fetch company-admin org-wide rollups — Surface 4.
 *
 * Backed by `GET /v1/observability/org-rollups` (5-min server-side cache).
 * 404 → null so the dashboard tiles render their zero/empty state instead
 * of an error toast (matches the rest of this module's 404 contract).
 */
export async function getOrgRollups(params: { org_id?: string } = {}) {
  try {
    const { data } = await api.get<OrgRollups>(
      "/v1/observability/org-rollups",
      { params }
    )
    return data
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
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
