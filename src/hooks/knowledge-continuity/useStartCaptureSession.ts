import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { startCaptureSession } from "@/services/knowledge-continuity/continuity.service"
import type { StartSessionRequest, StartSessionResponse } from "@/types/knowledge-continuity"

const CONSENT_REQUIRED_MESSAGE =
  "Consent record required for a real expert; use a practice session or attach a consent id."

/**
 * Start a knowledge-capture session (POST /v1/trainer/continuity/sessions).
 * A real (non-synthetic) expert session without a `consent_event_id` is
 * rejected with a 403 — that case gets a clear, specific toast instead of
 * the generic error message.
 */
export function useStartCaptureSession() {
  return useMutation<StartSessionResponse, AxiosError, StartSessionRequest>({
    mutationFn: async (body) => {
      const res = await startCaptureSession(body)
      if (!res.data) throw new Error("No session response from the server")
      return res.data
    },
    onSuccess: (session) => {
      toast.success(`Capture session started — ${session.id}`)
    },
    onError: (error) => {
      if (error.response?.status === 403) {
        toast.error(CONSENT_REQUIRED_MESSAGE)
        return
      }
      toast.error("Couldn't start the capture session. Please try again.")
    },
  })
}
