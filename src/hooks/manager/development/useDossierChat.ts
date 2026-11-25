import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getMemberChat,
  postMemberChat,
  type DossierChatHistory,
  type DossierChatMessage,
} from "@/services/manager/development/growthService"
import { developmentKeys } from "./queryKeys"

/** One cached read of the stored history; the two hooks below select from it. */
function chatHistoryQuery(memberId: string | undefined) {
  return {
    queryKey: developmentKeys.chat(memberId as string),
    queryFn: async (): Promise<DossierChatHistory> => {
      const r = await getMemberChat(memberId as string)
      return {
        messages: r.data?.data?.messages ?? [],
        hiddenTurns: r.data?.data?.hiddenTurns,
      }
    },
    enabled: Boolean(memberId),
    staleTime: 60_000,
  }
}

/**
 * Persisted Meridian chat for a member, so the manager can leave and resume the
 * conversation. Live replies still stream over the WebSocket; this loads the
 * stored history and appends each turn.
 */
export function useDossierChat(memberId: string | undefined) {
  return useQuery<DossierChatHistory, Error, DossierChatMessage[]>({
    ...chatHistoryQuery(memberId),
    select: (d) => d.messages,
  })
}

/**
 * How many stored turns the server did not return because the member withdrew
 * sharing after they were written (0 when none). Same request as
 * {@link useDossierChat}, so it costs no extra call.
 */
export function useDossierChatHiddenTurns(memberId: string | undefined) {
  return useQuery<DossierChatHistory, Error, number>({
    ...chatHistoryQuery(memberId),
    select: (d) => d.hiddenTurns ?? 0,
  })
}

/** Persist one chat turn (manager question or Meridian reply). Fire-and-forget:
 *  a failed save must never block the live conversation. */
export function useSaveChatMessage(memberId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<DossierChatMessage, Error, DossierChatMessage>({
    mutationFn: async (message) => {
      const r = await postMemberChat(memberId as string, message)
      return r.data?.data ?? message
    },
    onSuccess: () => {
      if (memberId) qc.invalidateQueries({ queryKey: developmentKeys.chat(memberId) })
    },
  })
}
