import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { extractUnits } from "@/services/knowledge-continuity/capture.service"
import { kceGuardText } from "@/services/knowledge-continuity/llmGuards"
import type { ExtractRequest, ExtractResponse } from "@/types/knowledge-continuity"

/**
 * Distill the interview transcript into scored knowledge units
 * (POST /v1/agents/kce/capture/extract, Agent Engine). The units are then
 * synthesized into the Reviewer Console — see {@link useSynthesizeUnits}.
 */
export function useExtractUnits() {
  const { t } = useTranslation("kcPages")
  return useMutation<ExtractResponse, AxiosError, ExtractRequest>({
    mutationFn: async (body) => {
      const res = await extractUnits(body)
      if (!res.data) throw new Error("No units returned from the server")
      return res.data
    },
    onError: (error) => {
      // 403 no access (entitlement) or role not allowed, 429 too many calls, 413/422 too long: say which, since
      // "try again" with the same body fails the same way (D-18).
      const refusal = kceGuardText(error, t)
      toast.error(refusal ?? "Couldn't synthesize this capture. Please try again.")
    },
  })
}
