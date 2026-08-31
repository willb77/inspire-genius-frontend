import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { extractUnits } from "@/services/knowledge-continuity/capture.service"
import type { ExtractRequest, ExtractResponse } from "@/types/knowledge-continuity"

/**
 * Distill the interview transcript into scored knowledge units
 * (POST /v1/agents/kce/capture/extract, Agent Engine). The units are then
 * synthesized into the Reviewer Console — see {@link useSynthesizeUnits}.
 */
export function useExtractUnits() {
  return useMutation<ExtractResponse, AxiosError, ExtractRequest>({
    mutationFn: async (body) => {
      const res = await extractUnits(body)
      if (!res.data) throw new Error("No units returned from the server")
      return res.data
    },
    onError: () => {
      toast.error("Couldn't synthesize this capture. Please try again.")
    },
  })
}
