/**
 * useQuestionBank — React Query hook wrapping the interview question-bank service.
 */
import { useQuery } from "@tanstack/react-query"

import { interviewService, type QuestionBank, type StarSection } from "@/services/interview/interview.service"

export function useQuestionBank(params?: {
  section?: StarSection["key"]
  includeExemplars?: boolean
  enabled?: boolean
}) {
  return useQuery<QuestionBank>({
    queryKey: ["interview", "question-bank", params?.section ?? "all", params?.includeExemplars ?? true],
    queryFn: () =>
      interviewService.getQuestionBank({
        section: params?.section,
        includeExemplars: params?.includeExemplars,
      }),
    enabled: params?.enabled ?? true,
    staleTime: 1000 * 60 * 30, // bank is a constant — cache generously
  })
}
