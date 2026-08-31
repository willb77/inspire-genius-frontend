/**
 * usePracticeQuestions — React Query hook for the candidate-safe practice bank.
 */
import { useQuery } from "@tanstack/react-query"

import { practiceService, type PracticeQuestions, type PracticeSection } from "@/services/interview/practice.service"

export function usePracticeQuestions(params?: {
  section?: PracticeSection["key"]
  enabled?: boolean
}) {
  return useQuery<PracticeQuestions>({
    queryKey: ["interview", "practice-questions", params?.section ?? "all"],
    queryFn: () => practiceService.getPracticeQuestions({ section: params?.section }),
    enabled: params?.enabled ?? true,
    staleTime: 1000 * 60 * 30, // question set is constant
  })
}
