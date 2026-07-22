import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
} from "@/services/documents/documentService"

/**
 * Honor Coach Workbench — the single source of truth for attaching a Fellow's
 * "artifacts" (assessments + documents + goals).
 *
 * REUSE, NOT RECREATE. Both the onboarding flow and the ad-hoc per-fellow
 * "add a missing artifact" surfaces need the SAME document-upload sequence, so
 * it lives here once. Assessment import is re-exported from assessment.service
 * (the agent-engine adapters own the parsing); goals go through coach.service.
 */

/** doc_kind values the Honor surfaces attach. */
export type HonorDocKind = "resume" | "bio" | "personal"

/**
 * Reusable 3-step presigned upload → process (document-service).
 * When `subjectUserId` is supplied (a coach uploading a member's doc), the row
 * is attributed to the MEMBER so it injects into their RAG — not the coach's.
 * Requires a coach-capable role server-side; omitted → server defaults to self.
 */
export async function uploadFellowDocument(
  file: File,
  docKind: HonorDocKind,
  subjectUserId?: string,
): Promise<void> {
  const presigned = await initiateUpload({
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    file_size: file.size,
    doc_kind: docKind,
    ...(subjectUserId ? { subject_user_id: subjectUserId } : {}),
  })
  await uploadToS3(presigned.upload_url, presigned.upload_fields, file)
  await triggerProcessing(presigned.document_id)
}

export { importFellowAssessment } from "./assessment.service"
