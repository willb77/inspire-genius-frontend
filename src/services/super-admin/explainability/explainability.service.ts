import { agentApi } from "@/lib/agentApi"
import type {
  AskList,
  AskRequest,
  AskResponse,
  ConversationDetail,
  ConversationListFilters,
  ConversationsList,
  TurnDetail,
} from "@/types/explainability/types"

const BASE = "/v1/explainability"

export async function listConversations(
  filters: ConversationListFilters = {}
): Promise<ConversationsList> {
  const { data } = await agentApi.get<ConversationsList>(`${BASE}/conversations`, {
    params: filters,
  })
  return data
}

export async function getConversation(sessionId: string): Promise<ConversationDetail> {
  const { data } = await agentApi.get<ConversationDetail>(
    `${BASE}/conversations/${encodeURIComponent(sessionId)}`
  )
  return data
}

export async function getTurn(turnId: string): Promise<TurnDetail> {
  const { data } = await agentApi.get<TurnDetail>(
    `${BASE}/turns/${encodeURIComponent(turnId)}`
  )
  return data
}

// ─── Phase 2 — Ask follow-ups ───────────────────────────────────────

export async function askTurn(
  turnId: string,
  body: AskRequest
): Promise<AskResponse> {
  const { data } = await agentApi.post<AskResponse>(
    `${BASE}/turns/${encodeURIComponent(turnId)}/ask`,
    body
  )
  return data
}

export async function listTurnAsks(turnId: string): Promise<AskList> {
  const { data } = await agentApi.get<AskList>(
    `${BASE}/turns/${encodeURIComponent(turnId)}/asks`
  )
  return data
}
