/**
 * useSurveys — thin React state wrapper over the browser-local `surveyStore`.
 *
 * The store is the source of truth; this hook just mirrors it into component
 * state and re-reads after each mutation so the UI stays in sync. Because the
 * data is local (not server state), this is `useState`-backed rather than React
 * Query — per the project's state rules, React Query is for server state only.
 */
import { useCallback, useState } from "react"

import type { Survey, SurveyAnswerValue } from "@/types/survey"
import {
  deleteSurvey as storeDelete,
  listSurveys,
  saveResponse as storeSaveResponse,
  saveSurvey as storeSave,
} from "@/lib/surveyStore"

export interface UseSurveysResult {
  surveys: Survey[]
  refresh: () => void
  upsertSurvey: (survey: Survey) => Survey
  removeSurvey: (id: string) => void
  submitResponse: (
    surveyId: string,
    answers: Record<string, SurveyAnswerValue>,
  ) => void
}

export function useSurveys(): UseSurveysResult {
  const [surveys, setSurveys] = useState<Survey[]>(() => listSurveys())

  const refresh = useCallback(() => {
    setSurveys(listSurveys())
  }, [])

  const upsertSurvey = useCallback(
    (survey: Survey): Survey => {
      const saved = storeSave(survey)
      setSurveys(listSurveys())
      return saved
    },
    [],
  )

  const removeSurvey = useCallback((id: string) => {
    storeDelete(id)
    setSurveys(listSurveys())
  }, [])

  const submitResponse = useCallback(
    (surveyId: string, answers: Record<string, SurveyAnswerValue>) => {
      storeSaveResponse(surveyId, answers)
    },
    [],
  )

  return { surveys, refresh, upsertSurvey, removeSurvey, submitResponse }
}
