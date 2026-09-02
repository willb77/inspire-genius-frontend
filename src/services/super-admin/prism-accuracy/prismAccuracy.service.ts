import { agentApi } from "@/lib/agentApi"
import type {
  ConversationRow,
  Rubric,
  ScoreRequest,
  ScoreResult,
  SessionScoreRequest,
  SessionScoreResult,
  SubjectRow,
  SubjectSummary,
} from "@/types/prism-accuracy"

/**
 * PRISM Accuracy Scorer API.
 *
 * Calls `agentApi`, NOT the monolith `api` instance — these routes live on the
 * agent-engine and are reached through `/v1/agents/{proxy+}`.
 */
const BASE = "/v1/agents/prism-accuracy"

type Envelope<T> = { status: boolean; data: T }

export async function fetchRubric(): Promise<Rubric> {
  const { data } = await agentApi.get<Envelope<Rubric>>(`${BASE}/rubric`)
  return data.data
}

export async function listSubjects(limit = 50, search?: string): Promise<SubjectRow[]> {
  const { data } = await agentApi.get<Envelope<SubjectRow[]>>(`${BASE}/subjects`, {
    params: { limit, search: search?.trim() || undefined },
  })
  return data.data
}

export async function listConversations(params: {
  user_id?: string
  search?: string
  limit?: number
} = {}): Promise<ConversationRow[]> {
  const { data } = await agentApi.get<Envelope<ConversationRow[]>>(`${BASE}/conversations`, {
    params: {
      user_id: params.user_id || undefined,
      search: params.search?.trim() || undefined,
      limit: params.limit ?? 30,
    },
  })
  return data.data
}

export async function getSubject(userId: string, salientK = 6): Promise<SubjectSummary> {
  const { data } = await agentApi.get<Envelope<SubjectSummary>>(
    `${BASE}/subjects/${encodeURIComponent(userId)}`,
    { params: { salient_k: salientK } },
  )
  return data.data
}

export async function scoreResponse(req: ScoreRequest): Promise<ScoreResult> {
  const { data } = await agentApi.post<Envelope<ScoreResult>>(`${BASE}/score`, req)
  return data.data
}

export async function scoreSession(req: SessionScoreRequest): Promise<SessionScoreResult> {
  const { data } = await agentApi.post<Envelope<SessionScoreResult>>(`${BASE}/score-session`, req)
  return data.data
}
