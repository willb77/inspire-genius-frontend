import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { nextQuestion } from "@/services/knowledge-continuity/capture.service"
import { kceGuardText } from "@/services/knowledge-continuity/llmGuards"
import type { NextQuestionRequest, NextQuestionResponse } from "@/types/knowledge-continuity"

/**
 * Ask Maven for the next interview question
 * (POST /v1/agents/kce/capture/next-question, Agent Engine). No success toast —
 * the question lands in the transcript panel; only failures surface a toast.
 */
export function useNextQuestion() {
  const { t } = useTranslation("kcPages")
  return useMutation<NextQuestionResponse, AxiosError, NextQuestionRequest>({
    mutationFn: async (body) => {
      const res = await nextQuestion(body)
      if (!res.data) throw new Error("No question returned from the server")
      return res.data
    },
    onError: (error) => {
      // 403 no access (entitlement) or role not allowed, 429 too many calls, 413/422 too long: say which, since
      // "try again" with the same body fails the same way (D-18).
      const refusal = kceGuardText(error, t)
      toast.error(refusal ?? "Couldn't get the next question. Please try again.")
    },
  })
}
