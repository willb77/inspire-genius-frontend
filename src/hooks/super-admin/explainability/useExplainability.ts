import { useQuery } from "@tanstack/react-query"
import {
  getConversation,
  getTurn,
  listConversations,
} from "@/services/super-admin/explainability/explainability.service"
import type { ConversationListFilters } from "@/types/explainability/types"

const QK = {
  list: (filters: ConversationListFilters) =>
    ["explainability", "conversations", filters] as const,
  conversation: (sessionId: string) =>
    ["explainability", "conversation", sessionId] as const,
  turn: (turnId: string) => ["explainability", "turn", turnId] as const,
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
