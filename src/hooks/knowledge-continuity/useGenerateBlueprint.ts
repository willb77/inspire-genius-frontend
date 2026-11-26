import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { generateBlueprint } from "@/services/knowledge-continuity/capture.service"
import { kceGuardMessageKey, kceGuardRefusal } from "@/services/knowledge-continuity/llmGuards"
import type {
  BlueprintGenerateRequest,
  BlueprintGenerateResponse,
} from "@/types/knowledge-continuity"

/**
 * Draft a role-knowledge taxonomy for review
 * (POST /v1/agents/kce/blueprint/generate, Agent Engine). No success toast — the
 * drafted tree lands in the review step; only failures surface a toast.
 */
export function useGenerateBlueprint() {
  const { t } = useTranslation("kcPages")
  return useMutation<BlueprintGenerateResponse, AxiosError, BlueprintGenerateRequest>({
    mutationFn: async (body) => {
      const res = await generateBlueprint(body)
      if (!res.data) throw new Error("No blueprint returned from the server")
      return res.data
    },
    onError: (error) => {
      // 403 no access, 429 too many calls, 413/422 too long: say which, since
      // "try again" with the same body fails the same way (D-18).
      const refusal = kceGuardRefusal(error)
      toast.error(refusal ? t(kceGuardMessageKey(refusal)) : "Couldn't draft the blueprint. Please try again.")
    },
  })
}
