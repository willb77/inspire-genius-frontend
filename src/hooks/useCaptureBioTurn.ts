import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { captureBioTurn } from "@/services/bio/bioService"
import type { CaptureRequest, CaptureResponse } from "@/types/bio"

export type CaptureBioTurnVars = CaptureRequest & {
  memberId: string
}

/**
 * Capture a single Chronicle chat turn — extract, persist, and reflect it back.
 *
 * This fires alongside the WebSocket chat send, not in place of it: the socket
 * carries the conversational reply while this mutation returns the structured
 * "Captured to your profile" reflection and the content-specific followups that
 * replace the old generic probe rotation. It is intentionally NOT tied into the
 * chat reply's lifecycle — the panel fires it in parallel and consumes the
 * result independently, so a slow or empty capture never blocks the reply.
 *
 * Per the frozen backend contract the endpoint never 500s; a turn with nothing
 * extractable resolves with `captured: false` and an empty `episodes` array
 * (the caller renders no card). The mutation therefore only rejects on a
 * transport/network failure, which the caller can safely ignore.
 */
export function useCaptureBioTurn() {
  return useMutation<CaptureResponse, AxiosError, CaptureBioTurnVars>({
    mutationFn: ({ memberId, message, moduleHint }) =>
      captureBioTurn(memberId, { message, moduleHint }),
  })
}
