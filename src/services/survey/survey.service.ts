/**
 * Survey service — raw axios calls against the survey-service (`/v1/surveys/*`).
 *
 * Uses the shared `api` instance (routes through the API Gateway → survey-service
 * Lambda). Every response is the `BaseApiResponse<T>` envelope; callers unwrap
 * `.data.data`. No React here — the hooks layer wraps these in React Query.
 */
import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type {
  Survey,
  SurveyAnswerValue,
  SurveyInput,
  SurveyParseResult,
  SurveyResponse,
  SurveySummary,
} from "@/types/survey"

const BASE = "/v1/surveys"

export type SurveyScope = "take" | "manage"

export const surveyService = {
  /** List surveys — `take` (exposed to my org) or `manage` (author's surveys). */
  list(scope: SurveyScope = "take") {
    return api
      .get<BaseApiResponse<Survey[]>>(BASE, { params: { scope } })
      .then((r) => r.data.data ?? [])
  },

  get(id: string) {
    return api.get<BaseApiResponse<Survey>>(`${BASE}/${id}`).then((r) => r.data.data)
  },

  create(input: SurveyInput) {
    return api.post<BaseApiResponse<Survey>>(BASE, input).then((r) => r.data.data)
  },

  update(id: string, input: SurveyInput) {
    return api.put<BaseApiResponse<Survey>>(`${BASE}/${id}`, input).then((r) => r.data.data)
  },

  remove(id: string) {
    return api.delete<BaseApiResponse<{ id: string; deleted: boolean }>>(`${BASE}/${id}`)
  },

  submitResponse(surveyId: string, answers: Record<string, SurveyAnswerValue>) {
    return api
      .post<BaseApiResponse<SurveyResponse>>(`${BASE}/${surveyId}/responses`, { answers })
      .then((r) => r.data.data)
  },

  /** Individual responses (author / manager+ only). */
  listResponses(surveyId: string) {
    return api
      .get<BaseApiResponse<SurveyResponse[]>>(`${BASE}/${surveyId}/responses`)
      .then((r) => r.data.data ?? [])
  },

  /** The compilation / aggregate across all responses (author / manager+ only). */
  summary(surveyId: string) {
    return api
      .get<BaseApiResponse<SurveySummary>>(`${BASE}/${surveyId}/summary`)
      .then((r) => r.data.data)
  },

  /** AI-assisted: turn pasted/uploaded text into a survey draft. */
  parse(text: string, title?: string) {
    return api
      .post<BaseApiResponse<SurveyParseResult>>(`${BASE}/parse`, { text, title })
      .then((r) => r.data.data)
  },
}
