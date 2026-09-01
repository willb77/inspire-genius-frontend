import { agentApi } from "@/lib/agentApi"

export interface DeletionManifest {
  request_id: string
  user_id: string
  requested_by: string
  requested_at: string
  completed_at?: string
  status: string
  stores: Record<string, { deleted_count: number; error?: string }>
  manifest_s3_key?: string
}

export interface DeletionResponse {
  success: boolean
  message: string
  request_id: string | null
  manifest: DeletionManifest | null
}

export interface ExportResponse {
  success: boolean
  data: {
    user_id: string
    exported_at: string
    categories: Record<string, unknown[]>
  }
}

export interface DeletionRequest {
  request_id: string
  user_id: string
  status: string
  requested_at: string
  requested_by?: string
  completed_at?: string
  manifest_s3_key?: string
}

export interface DeletionRequestsResponse {
  success: boolean
  requests: DeletionRequest[]
  count: number
}

export interface RetentionSweepResponse {
  success: boolean
  message: string
  report: Record<string, unknown>
}

export async function deleteUserData(userId: string): Promise<DeletionResponse> {
  const { data } = await agentApi.delete<DeletionResponse>(`/v1/privacy/user/${userId}`)
  return data
}

export interface ExportArchive {
  blob: Blob
  filename: string
  /** False when the backend could not notify the privacy inbox. */
  notified: boolean
}

/**
 * Download the subject-access archive.
 *
 * The endpoint returns a ZIP (`application/zip`), not JSON — the archive
 * carries a README, a manifest and one file per data category, which a
 * single JSON body cannot represent. `responseType: "blob"` is therefore
 * mandatory: without it axios coerces the bytes to a string and the saved
 * file is a corrupt archive that still "downloads successfully".
 */
export async function exportUserData(userId: string): Promise<ExportArchive> {
  const resp = await agentApi.get(`/v1/privacy/user/${userId}/export`, {
    responseType: "blob",
  })
  const disposition = String(resp.headers?.["content-disposition"] ?? "")
  const match = /filename="?([^"]+)"?/.exec(disposition)
  return {
    blob: resp.data as Blob,
    filename: match?.[1] ?? `inspire-genius-data-${new Date().toISOString().slice(0, 10)}.zip`,
    notified: String(resp.headers?.["x-ig-privacy-notified"] ?? "") !== "false",
  }
}

export async function getDeletionRequests(
  status?: string,
  limit = 50,
): Promise<DeletionRequestsResponse> {
  const params: Record<string, string | number> = { limit }
  if (status) params.status = status
  const { data } = await agentApi.get<DeletionRequestsResponse>("/v1/privacy/requests", { params })
  return data
}

export async function getDeletionManifest(
  requestId: string,
): Promise<{ success: boolean; manifest: DeletionManifest }> {
  const { data } = await agentApi.get<{ success: boolean; manifest: DeletionManifest }>(
    `/v1/privacy/requests/${requestId}`,
  )
  return data
}

export async function triggerRetentionSweep(): Promise<RetentionSweepResponse> {
  const { data } = await agentApi.post<RetentionSweepResponse>("/v1/privacy/retention/sweep")
  return data
}
