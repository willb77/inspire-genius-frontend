import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { recordTurn } from "@/services/knowledge-continuity/continuity.service"
import type { RecordTurnRequest } from "@/types/knowledge-continuity"

type RecordTurnVars = {
  sessionId: string
  body: RecordTurnRequest
}

/**
 * Persist one interview exchange (POST
 * /v1/trainer/continuity/sessions/{sessionId}/turns) so the capture survives a
 * dropped connection. Failure is non-fatal to the interview — the exchange
 * still shows locally — but we surface a toast so the expert knows to retry.
 */
export function useRecordTurn() {
  return useMutation<unknown, AxiosError, RecordTurnVars>({
    mutationFn: async ({ sessionId, body }) => {
      const res = await recordTurn(sessionId, body)
      return res.data
    },
    onError: () => {
      toast.error("Couldn't save that answer. It may not be captured.")
    },
  })
}
