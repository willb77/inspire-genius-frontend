import { agentApi } from "@/lib/agentApi"
import type {
  ResumeWriterApiResponse,
  ResumeWriterRequest,
  ResumeWriterResult,
  ResumeWriterSources,
} from "@/types/resumeWriter"

/**
 * Résumé Writer (2026-10-19). Agent-engine routes, so `agentApi` — under the
 * `/v1/agents/` prefix that has an API Gateway integration to the engine. The
 * subject is the token's own user; nothing here names anyone else.
 */
export const RESUME_WRITER_BASE = "/v1/agents/resume-writer/me"

/** What the caller has on file, whether generation is on, and today's count. */
export async function getResumeWriterSources(): Promise<ResumeWriterSources> {
  const { data } = await agentApi.get<ResumeWriterApiResponse<ResumeWriterSources>>(RESUME_WRITER_BASE)
  return data.data
}

/** Draft the caller's résumé. `{ disabled: true }` while the server switch is off. */
export async function generateMyResume(body: ResumeWriterRequest): Promise<ResumeWriterResult> {
  const { data } = await agentApi.post<ResumeWriterApiResponse<ResumeWriterResult>>(RESUME_WRITER_BASE, body)
  return data.data
}
