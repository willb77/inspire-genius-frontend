/**
 * React Query hooks over the survey-service.
 *
 * Server state only — surveys and responses live in the survey-service, so these
 * are React Query (not local state). Mutations invalidate the relevant keys.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { surveyService, type SurveyScope } from "@/services/survey/survey.service"
import type { SurveyAnswerValue, SurveyInput } from "@/types/survey"

const KEYS = {
  all: ["surveys"] as const,
  list: (scope: SurveyScope) => ["surveys", "list", scope] as const,
  detail: (id: string) => ["surveys", "detail", id] as const,
  responses: (id: string) => ["surveys", "responses", id] as const,
  summary: (id: string) => ["surveys", "summary", id] as const,
}

export function useSurveys(scope: SurveyScope = "take") {
  return useQuery({
    queryKey: KEYS.list(scope),
    queryFn: () => surveyService.list(scope),
  })
}

export function useSurvey(id: string | null) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ""),
    queryFn: () => surveyService.get(id as string),
    enabled: !!id,
  })
}

export function useSurveyResponses(id: string | null, enabled = true) {
  return useQuery({
    queryKey: KEYS.responses(id ?? ""),
    queryFn: () => surveyService.listResponses(id as string),
    enabled: !!id && enabled,
  })
}

export function useSurveySummary(id: string | null, enabled = true) {
  return useQuery({
    queryKey: KEYS.summary(id ?? ""),
    queryFn: () => surveyService.summary(id as string),
    enabled: !!id && enabled,
  })
}

export function useCreateSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SurveyInput) => surveyService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SurveyInput }) =>
      surveyService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useDeleteSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => surveyService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useSubmitResponse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      surveyId,
      answers,
    }: {
      surveyId: string
      answers: Record<string, SurveyAnswerValue>
    }) => surveyService.submitResponse(surveyId, answers),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.summary(vars.surveyId) })
      qc.invalidateQueries({ queryKey: KEYS.responses(vars.surveyId) })
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useParseSurvey() {
  return useMutation({
    mutationFn: ({ text, title }: { text: string; title?: string }) =>
      surveyService.parse(text, title),
  })
}
