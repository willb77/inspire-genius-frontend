import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getMemberChat,
  postMemberChat,
  type DossierChatMessage,
} from "@/services/manager/development/growthService"
import { developmentKeys } from "./queryKeys"

/**
 * Persisted Meridian chat for a member, so the manager can leave and resume the
 * conversation. Live replies still stream over the WebSocket; this loads the
 * stored history and appends each turn.
 */
export function useDossierChat(memberId: string | undefined) {
  return useQuery<DossierChatMessage[]>({
    queryKey: developmentKeys.chat(memberId as string),
    queryFn: async () => {
      const r = await getMemberChat(memberId as string)
      return r.data?.data?.messages ?? []
    },
    enabled: Boolean(memberId),
    staleTime: 60_000,
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
