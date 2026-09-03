import { agentApi } from "@/lib/agentApi"
import type {
  AnswerFilters,
  ExamAnswer,
  ExamRun,
  ExamRunDetail,
  QuestionSet,
  QuestionSetInput,
  QuestionSetSummary,
  RunDiff,
  StartRunInput,
  StartRunResult,
} from "@/types/prism-exam"

/**
 * PRISM Practitioner Exam API.
 *
 * Calls `agentApi`, NOT the monolith `api` instance — these routes live on the
 * agent-engine and are reached through `/v1/agents/{proxy+}`.
 *
 * The routes return their payload bare. `unwrap` also accepts the
 * `{status, data}` envelope the sibling PRISM Accuracy routes use, so the page
 * keeps working if the backend is ever brought in line with them.
 */
const BASE = "/v1/agents/prism-exam"

type MaybeEnvelope<T> = T | { status: boolean; data: T }

export function unwrap<T>(payload: MaybeEnvelope<T>): T {
  if (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "status" in payload &&
    "data" in payload &&
    typeof (payload as { status: unknown }).status === "boolean"
  ) {
    return (payload as { data: T }).data
  }
  return payload as T
}

// ── question sets ────────────────────────────────────────────────────

export async function listQuestionSets(): Promise<QuestionSetSummary[]> {
  const { data } = await agentApi.get<MaybeEnvelope<QuestionSetSummary[]>>(`${BASE}/question-sets`)
  return unwrap(data)
}

export async function getActiveQuestionSet(): Promise<QuestionSet> {
  const { data } = await agentApi.get<MaybeEnvelope<QuestionSet>>(`${BASE}/question-sets/active`)
  return unwrap(data)
}

export async function getQuestionSet(setId: string): Promise<QuestionSet> {
  const { data } = await agentApi.get<MaybeEnvelope<QuestionSet>>(
    `${BASE}/question-sets/${encodeURIComponent(setId)}`,
  )
  return unwrap(data)
}

export async function replaceActiveQuestionSet(input: QuestionSetInput): Promise<QuestionSetSummary> {
  const { data } = await agentApi.put<MaybeEnvelope<QuestionSetSummary>>(`${BASE}/question-sets/active`, input)
  return unwrap(data)
}

// ── runs ─────────────────────────────────────────────────────────────

export async function startRun(input: StartRunInput = {}): Promise<StartRunResult> {
  const { data } = await agentApi.post<MaybeEnvelope<StartRunResult>>(`${BASE}/runs`, {
    question_set_id: input.question_set_id || undefined,
    label: input.label?.trim() || undefined,
    concurrency: input.concurrency ?? 2,
  })
  return unwrap(data)
}

export async function listRuns(limit = 50, allTiers = false): Promise<ExamRun[]> {
  const { data } = await agentApi.get<MaybeEnvelope<ExamRun[]>>(`${BASE}/runs`, {
    params: { limit, all_tiers: allTiers || undefined },
  })
  return unwrap(data)
}

export async function getRun(runId: string): Promise<ExamRunDetail> {
  const { data } = await agentApi.get<MaybeEnvelope<ExamRunDetail>>(`${BASE}/runs/${encodeURIComponent(runId)}`)
  return unwrap(data)
}

export async function listAnswers(runId: string, filters: AnswerFilters = {}): Promise<ExamAnswer[]> {
  const { data } = await agentApi.get<MaybeEnvelope<ExamAnswer[]>>(
    `${BASE}/runs/${encodeURIComponent(runId)}/answers`,
    { params: { verdict: filters.verdict || undefined, chapter: filters.chapter || undefined } },
  )
  return unwrap(data)
}

export async function cancelRun(runId: string): Promise<ExamRun> {
  const { data } = await agentApi.post<MaybeEnvelope<ExamRun>>(`${BASE}/runs/${encodeURIComponent(runId)}/cancel`)
  return unwrap(data)
}

export async function diffRuns(runA: string, runB: string): Promise<RunDiff> {
  const { data } = await agentApi.get<MaybeEnvelope<RunDiff>>(
    `${BASE}/runs/${encodeURIComponent(runA)}/diff/${encodeURIComponent(runB)}`,
  )
  return unwrap(data)
}
