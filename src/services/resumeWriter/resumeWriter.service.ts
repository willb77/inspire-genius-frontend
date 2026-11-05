import axios from "axios"
import { agentApi } from "@/lib/agentApi"
import { getDownloadUrl, listDocumentsV2 } from "@/services/documents/documentService"
import { JOB_DESCRIPTION_KIND } from "@/lib/resume/guided/jobFile"
import {
  type InterviewQuestion,
  type ResumeJobStarted,
  type ResumeJobState,
  type ResumeQuestionsRequest,
  type ResumeQuestionsStarted,
  type ResumeQuestionsState,
  type ResumeWriterApiResponse,
  type ResumeWriterDisabled,
  type ResumeWriterRequest,
  type ResumeWriterResult,
  type ResumeWriterSources,
} from "@/types/resumeWriter"

/**
 * Résumé Writer (2026-10-19). Agent-engine routes, so `agentApi` — under the
 * `/v1/agents/` prefix that has an API Gateway integration to the engine. The
 * subject is the token's own user; nothing here names anyone else.
 */
export const RESUME_WRITER_BASE = "/v1/agents/resume-writer/me"
/** RW2 — the async-jobs pair: a full résumé can outlast the gateway's 30 s. */
export const RESUME_WRITER_JOBS = `${RESUME_WRITER_BASE}/jobs`
/** RWO-8 — the résumé interview, also a job pair. Free; capped per day by the server. */
export const RESUME_WRITER_QUESTIONS = `${RESUME_WRITER_BASE}/questions`

/** What the caller has on file, whether generation is on, and today's count.
 * RW2: with a `jobId`, the server also names that role (only while its tailored
 * switch is on, and only a role the caller's organisation can see). */
export async function getResumeWriterSources(jobId?: string): Promise<ResumeWriterSources> {
  const { data } = jobId
    ? await agentApi.get<ResumeWriterApiResponse<ResumeWriterSources>>(RESUME_WRITER_BASE, { params: { jobId } })
    : await agentApi.get<ResumeWriterApiResponse<ResumeWriterSources>>(RESUME_WRITER_BASE)
  return data.data
}

/** Draft the caller's résumé in one request. `{ disabled: true }` while the server switch is off. */
export async function generateMyResume(body: ResumeWriterRequest): Promise<ResumeWriterResult> {
  const { data } = await agentApi.post<ResumeWriterApiResponse<ResumeWriterResult>>(RESUME_WRITER_BASE, body)
  return data.data
}

/** RW2 — accept a generation; the slot is taken before the 202. */
export async function startResumeJob(body: ResumeWriterRequest): Promise<ResumeJobStarted | ResumeWriterDisabled> {
  const { data } = await agentApi.post<ResumeWriterApiResponse<ResumeJobStarted | ResumeWriterDisabled>>(
    RESUME_WRITER_JOBS,
    body,
  )
  return data.data
}

/** RW2 — poll one generation. The finished résumé is handed over once. */
export async function getResumeJob(jobId: string): Promise<ResumeJobState> {
  const { data } = await agentApi.get<ResumeWriterApiResponse<ResumeJobState>>(
    `${RESUME_WRITER_JOBS}/${encodeURIComponent(jobId)}`,
  )
  return data.data
}

/** An engine without the jobs route answers FastAPI's own 404 ("Not Found") or 405. */
function jobsRouteMissing(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail
  return status === 405 || (status === 404 && detail === "Not Found")
}

export type PollOptions = {
  intervalMs?: number
  timeoutMs?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * RW2 — draft the caller's résumé through the job pair and wait for it.
 *
 * Falls back to the one-request route only when the engine has no jobs route
 * yet (deploy order), never on a refusal: a 404 for a role the caller cannot
 * see carries the server's own reason and is thrown as it is.
 */
export async function generateMyResumeJob(
  body: ResumeWriterRequest,
  { intervalMs = 2000, timeoutMs = 180_000, sleep = defaultSleep }: PollOptions = {},
): Promise<ResumeWriterResult> {
  let started: ResumeJobStarted | ResumeWriterDisabled
  try {
    started = await startResumeJob(body)
  } catch (err) {
    if (jobsRouteMissing(err)) return generateMyResume(body)
    throw err
  }
  if ((started as ResumeWriterDisabled).disabled === true) return { disabled: true }
  const { jobId } = started as ResumeJobStarted

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await sleep(intervalMs)
    const job = await getResumeJob(jobId)
    if (job.status === "complete" && job.result) return job.result
    if (job.status === "error" || job.status === "expired" || job.status === "complete") {
      throw new Error(job.error || "The draft couldn't be written. Try again in a moment.")
    }
  }
  throw new Error("The draft is taking longer than it should. Try again in a moment.")
}

/**
 * RWO-8 — the résumé interview: start it and wait for the questions. `[]` when
 * there is nothing to ask; `{ disabled: true }` while the server switch is off.
 * Questions take no draft slot.
 */
export async function askResumeQuestions(
  body: ResumeQuestionsRequest,
  { intervalMs = 2000, timeoutMs = 90_000, sleep = defaultSleep }: PollOptions = {},
): Promise<InterviewQuestion[] | ResumeWriterDisabled> {
  const { data } = await agentApi.post<ResumeWriterApiResponse<ResumeQuestionsStarted | ResumeWriterDisabled>>(
    RESUME_WRITER_QUESTIONS,
    body,
  )
  const started = data.data
  if ((started as ResumeWriterDisabled).disabled === true) return { disabled: true }
  const { jobId, questions } = started as ResumeQuestionsStarted
  if (!jobId) return questions ?? []

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await sleep(intervalMs)
    const { data: polled } = await agentApi.get<ResumeWriterApiResponse<ResumeQuestionsState>>(
      `${RESUME_WRITER_QUESTIONS}/${encodeURIComponent(jobId)}`,
    )
    const job = polled.data
    if (job.status === "complete" && job.questions) return job.questions
    if (job.status === "error" || job.status === "expired" || job.status === "complete") {
      throw new Error(job.error || "We couldn't think of questions just now. You can write your résumé without them.")
    }
  }
  throw new Error("The questions are taking too long. You can write your résumé without them.")
}

// ── RWO-8 §9: saved job descriptions ────────────────────────────────────────

/** A stored job description the person can reuse for 90 days. */
export type SavedJobDescription = { id: string; filename: string; contentType: string; expiresAt: string | null }

/** The caller's own stored job descriptions that passed the virus scan. Goes
 * through document-service's owner-scoped list, never another person's. */
export async function listSavedJobDescriptions(): Promise<SavedJobDescription[]> {
  const out = await listDocumentsV2({ doc_kind: JOB_DESCRIPTION_KIND, status: "ready", limit: 20 })
  return out.documents
    .filter((d) => d.doc_kind === JOB_DESCRIPTION_KIND && d.status === "ready")
    .map((d) => ({ id: d.id, filename: d.filename, contentType: d.content_type, expiresAt: d.expires_at ?? null }))
}

/** Fetch a saved job description's file through the caller's own download URL,
 * so the page can read it on the device again. */
export async function fetchSavedJobFile(saved: SavedJobDescription): Promise<File> {
  const url = await getDownloadUrl(saved.id)
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Couldn't open ${saved.filename}`)
  const blob = await resp.blob()
  return new File([blob], saved.filename, { type: saved.contentType || blob.type })
}
