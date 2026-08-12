/**
 * React Query hook for the Interview Studio topic-generation step. The run
 * loop (create/submit/score/finalize) reuses the live-interview hooks in
 * {@link useLiveInterview} — only generation is studio-specific.
 */
import { useMutation } from "@tanstack/react-query"

import {
  studioInterviewService,
  type GenerateQuestionsPayload,
  type GeneratedQuestionSet,
} from "@/services/interview/studio.service"

export function useGenerateStudioQuestions() {
  return useMutation<GeneratedQuestionSet, Error, GenerateQuestionsPayload>({
    mutationFn: (payload) => studioInterviewService.generateQuestions(payload),
  })
}
