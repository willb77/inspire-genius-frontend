/**
 * React Query hooks for the Interview Studio setup step — topic generation and
 * the curated employer/sector packs. The run loop (create/submit/score/
 * finalize) reuses the live-interview hooks in {@link useLiveInterview}.
 */
import { useMutation, useQuery } from "@tanstack/react-query"

import {
  studioInterviewService,
  type EmployerPackCatalogue,
  type EmployerPackDetail,
  type GenerateQuestionsPayload,
  type GeneratedQuestionSet,
} from "@/services/interview/studio.service"

export function useGenerateStudioQuestions() {
  return useMutation<GeneratedQuestionSet, Error, GenerateQuestionsPayload>({
    mutationFn: (payload) => studioInterviewService.generateQuestions(payload),
  })
}

/**
 * The employer/sector pack catalogue.
 *
 * Curated static data — it changes only when the dataset ships, so it is cached
 * for the session rather than refetched per open of the picker.
 */
export function useEmployerPacks(enabled = true) {
  return useQuery<EmployerPackCatalogue, Error>({
    queryKey: ["interview", "employer-packs"],
    queryFn: () => studioInterviewService.getEmployerPacks(),
    enabled,
    staleTime: Infinity,
    retry: 1,
  })
}

/** Load one pack's questions on demand, to seed the editor. */
export function useLoadEmployerPack() {
  return useMutation<EmployerPackDetail, Error, string>({
    mutationFn: (slug) => studioInterviewService.getEmployerPack(slug),
  })
}
