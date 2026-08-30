import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { synthesizeUnits } from "@/services/knowledge-continuity/continuity.service"
import type { ExtractedUnit } from "@/types/knowledge-continuity"

type SynthesizeVars = {
  sessionId: string
  units: ExtractedUnit[]
}

/**
 * Hand the extracted units to the trainer-service (POST
 * /v1/trainer/continuity/sessions/{sessionId}/synthesize) so they are scored
 * and land in the Reviewer Console. The body is a raw array of units.
 */
export function useSynthesizeUnits() {
  return useMutation<unknown, AxiosError, SynthesizeVars>({
    mutationFn: async ({ sessionId, units }) => {
      const res = await synthesizeUnits(sessionId, units)
      return res.data
    },
    onError: () => {
      toast.error("Couldn't send the capture for review. Please try again.")
    },
  })
}
