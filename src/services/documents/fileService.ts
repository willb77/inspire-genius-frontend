/**
 * Legacy `fileService` surface — preserved for callers (Chat document
 * picker, UploadDocumentsModal) that still expect the old function names
 * + the date-grouped `listDocuments` response shape.
 *
 * The implementation now delegates to the document-service B.2 flow
 * (presigned URL → S3 → trigger processing → Aurora `documents` +
 * pgvector). See `documentService.ts` for the canonical client. Per the
 * 2026-05-10 pgvector consolidation decision, the monolith's
 * /v1/file_service/* path is being retired with the monolith Alex agent.
 *
 * NOTE on response shapes:
 * - `listDocuments` still returns `{ date_groups: ApiGroup[], total_pages }`
 *   because chat consumers (MeridianChat, CoachChat) read that shape.
 *   The flat document list from document-service is grouped client-side
 *   here so the chat code doesn't need to change.
 * - `uploadDocuments` still returns `{ uploaded_files: [...] }` because
 *   `useDocumentUploadMulti` reads that shape — but each entry now
 *   represents a presigned-URL upload, not a monolith multipart insert.
 */
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
  listDocumentsV2,
  deleteDocumentV2,
  getDownloadUrl,
  type DocumentOut,
} from "./documentService";

// ─── List ────────────────────────────────────────────────────────────
//
// Chat consumers expect a date-grouped shape:
//   { date_groups: [{ date_label, date, files: [{id, filename, file_type, file_key, created_at, ...}] }], total_pages }
//
// document-service returns a flat `DocumentListOut`. We group client-side
// by created_at (YYYY-MM-DD) to preserve the legacy shape.

type LegacyFile = {
  id: string;
  filename: string;
  file_type: string;
  file_key: string;
  created_at: string;
  category_name?: string;
};

type LegacyGroup = {
  date_label: string;
  date: string;
  files: LegacyFile[];
};

type LegacyListResponse = {
  date_groups: LegacyGroup[];
  total_pages: number;
  total_count: number;
};

function toLegacyFile(doc: DocumentOut): LegacyFile {
  return {
    id: doc.id,
    filename: doc.filename,
    file_type: doc.doc_kind ?? doc.content_type ?? "doc",
    // Legacy field name; document-service's metadata may not include the s3 key
    // for the user list (we use IDs everywhere else now).
    file_key: (doc.metadata?.["s3_key"] as string | undefined) ?? "",
    created_at: doc.created_at,
  };
}

function groupByDay(docs: DocumentOut[]): LegacyGroup[] {
  const byDay = new Map<string, LegacyFile[]>();
  for (const d of docs) {
    const day = (d.created_at ?? "").slice(0, 10); // YYYY-MM-DD
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(toLegacyFile(d));
  }
  // Sort days descending (newest first) — matches old monolith ordering.
  const sortedDays = Array.from(byDay.keys()).sort().reverse();
  return sortedDays.map((day) => ({
    date_label: day,
    date: day,
    files: byDay.get(day)!,
  }));
}

export async function listDocuments(
  page = 1,
  limit = 10,
  filters?: { date?: string; search?: string },
): Promise<LegacyListResponse> {
  const offset = (page - 1) * limit;
  const result = await listDocumentsV2({
    limit,
    offset,
    search: filters?.search,
    // Note: the legacy `filters.date` was a YYYY-MM-DD picker; document-service
    // doesn't support a per-day filter natively. We over-fetch the page and
    // filter client-side. For pagination correctness on a large corpus we'd
    // want server-side date support — flagged as a follow-up.
  });

  let docs = result.documents;
  if (filters?.date) {
    docs = docs.filter((d) => (d.created_at ?? "").startsWith(filters.date!));
  }

  const total_pages = Math.max(1, Math.ceil(result.total / limit));
  return {
    date_groups: groupByDay(docs),
    total_pages,
    total_count: result.total,
  };
}

// ─── Download ────────────────────────────────────────────────────────

export async function getDocumentDownloadLink(fileId: string): Promise<string> {
  return getDownloadUrl(fileId);
}

// ─── Delete ──────────────────────────────────────────────────────────

export async function deleteDocument(fileId: string): Promise<void> {
  await deleteDocumentV2(fileId);
}

export async function bulkDeleteDocuments(fileIds: string[]): Promise<void> {
  if (!Array.isArray(fileIds) || fileIds.length === 0) return;
  await Promise.all(fileIds.map((id) => deleteDocumentV2(id)));
}

// ─── Upload ──────────────────────────────────────────────────────────
//
// New B.2 flow per file:
//   1. POST /v1/documents/upload  → presigned PUT URL + document_id
//   2. PUT to S3 (direct, no backend in upload byte path)
//   3. POST /v1/documents/{id}/process  → kicks off scan + extract +
//      chunk + embed → pgvector
//
// Returns the legacy `{ uploaded_files: [{file_id, filename, file_type, file_key}] }`
// shape so `useDocumentUploadMulti` continues to work unchanged.

type LegacyUploadResult = {
  uploaded_files: Array<{
    file_id: string;
    filename: string;
    file_type: string;
    file_key: string;
  }>;
};

export async function uploadDocuments(
  files: File[],
  onProgress?: (p: number) => void,
): Promise<LegacyUploadResult> {
  if (!files.length) return { uploaded_files: [] };

  const uploaded: LegacyUploadResult["uploaded_files"] = [];
  const total = files.length;
  let completed = 0;

  for (const file of files) {
    // 1. Presigned URL
    const presigned = await initiateUpload({
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      file_size: file.size,
    });

    // 2. Direct S3 upload — proportional progress across the batch
    await uploadToS3(
      presigned.upload_url,
      presigned.upload_fields,
      file,
      (pct) => {
        if (!onProgress) return;
        const overall = Math.floor(((completed * 100 + pct) / (total * 100)) * 100);
        onProgress(Math.min(100, overall));
      },
    );

    // 3. Kick off the processing pipeline. This returns the canonical
    //    DocumentOut once scan/extract/chunk/embed have run (or queued).
    const doc = await triggerProcessing(presigned.document_id);

    uploaded.push({
      file_id: doc.id,
      filename: doc.filename,
      file_type: doc.doc_kind ?? doc.content_type ?? "doc",
      file_key: presigned.s3_key,
    });

    completed += 1;
    onProgress?.(Math.floor((completed / total) * 100));
  }

  return { uploaded_files: uploaded };
}
