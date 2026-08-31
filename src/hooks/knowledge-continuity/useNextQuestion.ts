import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { nextQuestion } from "@/services/knowledge-continuity/capture.service"
import type { NextQuestionRequest, NextQuestionResponse } from "@/types/knowledge-continuity"

/**
 * Ask Maven for the next interview question
 * (POST /v1/agents/kce/capture/next-question, Agent Engine). No success toast —
 * the question lands in the transcript panel; only failures surface a toast.
 */
export function useNextQuestion() {
  return useMutation<NextQuestionResponse, AxiosError, NextQuestionRequest>({
    mutationFn: async (body) => {
      const res = await nextQuestion(body)
      if (!res.data) throw new Error("No question returned from the server")
      return res.data
    },
    onError: () => {
      toast.error("Couldn't get the next question. Please try again.")
    },
  })
}
