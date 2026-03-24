import { api } from "@/lib/axios";

// Lists documents from the backend file service
// Endpoint: /v1/file_service/list?page=<number>&limit=<number>
export async function listDocuments(page = 1, limit = 10, filters?: { date?: string; search?: string }): Promise<unknown> {
  const params: Record<string, unknown> = { page, limit };
  if (filters) {
    if (typeof filters.date === "string" && filters.date) params.date = filters.date;
    if (typeof filters.search === "string" && filters.search) params.search = filters.search;
  }
  const resp = await api.get("/v1/file_service/list", {
    params,
    withCredentials: true,
  });
  // Unwrap the BaseApiResponse envelope.
  // Backend returns: { status, data: { date_groups, total_pages, … } }
  // After axios parses JSON, resp.data = that object.
  // We need to drill down to the object that contains `date_groups`.
  const body = resp.data as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") return body;

  // If body itself has date_groups, it's already unwrapped
  if (Array.isArray((body as Record<string, unknown>).date_groups)) return body;

  // Unwrap one level: body.data should contain { date_groups, total_pages }
  const inner = body.data as Record<string, unknown> | undefined;
  if (inner && typeof inner === "object") {
    // Check for double-wrap: inner.data might contain the real payload
    if (Array.isArray((inner as Record<string, unknown>).date_groups)) return inner;
    const deeper = (inner as Record<string, unknown>).data as Record<string, unknown> | undefined;
    if (deeper && typeof deeper === "object" && Array.isArray(deeper.date_groups)) return deeper;
    return inner;
  }

  return body;
}

// Fetches a download link for a given file id
// Endpoint: /v1/file_service/download/{file_id}
export async function getDocumentDownloadLink(fileId: string): Promise<string> {
  const resp = await api.get(`/v1/file_service/download/${encodeURIComponent(fileId)}`, {
  });
  const data = resp.data as unknown;
  // Accept either a raw string URL or an object with a url/link field
  // Also handle BaseApiResponse envelope: { status, data: { url } }
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const maybe = (data as Record<string, unknown>);
    // Check top-level first
    const topUrl = (maybe.url ?? maybe.link ?? maybe.download_url) as string | undefined;
    if (topUrl && typeof topUrl === "string") return topUrl;
    // Unwrap envelope if present
    const inner = maybe.data;
    if (typeof inner === "string") return inner;
    if (inner && typeof inner === "object") {
      const innerObj = inner as Record<string, unknown>;
      const innerUrl = (innerObj.url ?? innerObj.link ?? innerObj.download_url) as string | undefined;
      if (innerUrl && typeof innerUrl === "string") return innerUrl;
    }
  }
  throw new Error("Unexpected download link response shape");
}

// Deletes a file by id
// Endpoint: /v1/file_service/{file_id}
export async function deleteDocument(fileId: string): Promise<void> {
  await api.delete(`/v1/file_service/${encodeURIComponent(fileId)}`, {
    withCredentials: true,
  });
}

// Bulk delete files
// Endpoint: /v1/file_service/bulk-delete
// Body: { file_ids: string[] }
export async function bulkDeleteDocuments(fileIds: string[]): Promise<void> {
  if (!Array.isArray(fileIds) || fileIds.length === 0) return;
  await api.post(
    "/v1/file_service/bulk-delete",
    { file_ids: fileIds },
    { withCredentials: true }
  );
}

// Uploads one or more files using multipart/form-data
// Field name: 'files' (array)
export async function uploadDocuments(files: File[], onProgress?: (p: number) => void): Promise<unknown> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const resp = await api.post("/v1/file_service/upload", form, {
    withCredentials: true,
    // Do NOT set Content-Type manually — axios auto-sets it with the
    // correct multipart boundary when the body is a FormData instance.
    onUploadProgress: (e) => {
      if (!onProgress) return;
      const total = e.total ?? 0;
      const loaded = e.loaded ?? 0;
      if (total > 0) onProgress(Math.min(100, Math.floor((loaded / total) * 100)));
    },
  });
  // Unwrap BaseApiResponse envelope if present
  const body = resp.data as Record<string, unknown> | undefined;
  return (body?.data ?? body) as unknown;
}
