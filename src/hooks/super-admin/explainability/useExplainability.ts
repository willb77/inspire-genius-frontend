import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  askTurn,
  getConversation,
  getTurn,
  listConversations,
  listTurnAsks,
} from "@/services/super-admin/explainability/explainability.service"
import type {
  AskResponse,
  ConversationListFilters,
} from "@/types/explainability/types"

const QK = {
  list: (filters: ConversationListFilters) =>
    ["explainability", "conversations", filters] as const,
  conversation: (sessionId: string) =>
    ["explainability", "conversation", sessionId] as const,
  turn: (turnId: string) => ["explainability", "turn", turnId] as const,
  asks: (turnId: string) => ["explainability", "asks", turnId] as const,
}

export function useConversations(filters: ConversationListFilters = {}) {
  return useQuery({
    queryKey: QK.list(filters),
    queryFn: () => listConversations(filters),
    staleTime: 30_000,
  })
}

export function useConversation(sessionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QK.conversation(sessionId ?? ""),
    queryFn: () => getConversation(sessionId as string),
    enabled: enabled && !!sessionId,
    staleTime: 30_000,
  })
}

export function useTurn(turnId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QK.turn(turnId ?? ""),
    queryFn: () => getTurn(turnId as string),
    enabled: enabled && !!turnId,
    staleTime: 30_000,
  })
}

// ─── Phase 2 — Ask follow-ups ───────────────────────────────────────

export function useTurnAsks(turnId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QK.asks(turnId ?? ""),
    queryFn: () => listTurnAsks(turnId as string),
    enabled: enabled && !!turnId,
    staleTime: 5_000,
  })
}

export function useAsk(turnId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<AskResponse, Error, string>({
    mutationFn: (question: string) => askTurn(turnId as string, { question }),
    onSuccess: () => {
      if (turnId) {
        qc.invalidateQueries({ queryKey: QK.asks(turnId) })
      }
    },
  })
}
