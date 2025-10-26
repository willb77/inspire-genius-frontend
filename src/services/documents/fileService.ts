import { api } from "@/lib/axios";

// Lists documents from the backend file service
// Endpoint: /v1/file_service/list?page=<number>&limit=<number>
export async function listDocuments(page = 1, limit = 10): Promise<unknown> {
  const resp = await api.get("/v1/file_service/list", {
    params: { page, limit },
    withCredentials: true,
  });
  return resp.data as unknown;
}

// Fetches a download link for a given file id
// Endpoint: /v1/file_service/download/{file_id}
export async function getDocumentDownloadLink(fileId: string): Promise<string> {
  const resp = await api.get(`/v1/file_service/download/${encodeURIComponent(fileId)}`, {
  });
  const data = resp.data as unknown;
  // Accept either a raw string URL or an object with a url/link field
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const maybe = (data as Record<string, unknown>);
    const url = (maybe.url ?? maybe.link ?? maybe.download_url) as string | undefined;
    if (url && typeof url === "string") return url;
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

// Uploads one or more files using multipart/form-data
// Field name: 'files' (array)
export async function uploadDocuments(files: File[], onProgress?: (p: number) => void): Promise<unknown> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const resp = await api.post("/v1/file_service/upload", form, {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (!onProgress) return;
      const total = e.total ?? 0;
      const loaded = e.loaded ?? 0;
      if (total > 0) onProgress(Math.min(100, Math.floor((loaded / total) * 100)));
    },
  });
  return resp.data as unknown;
}
