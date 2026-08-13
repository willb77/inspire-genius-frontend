/**
 * Survey domain types.
 *
 * A **Survey** is an author-defined questionnaire: a title, an optional
 * description, and an ordered list of questions. A **SurveyResponse** is one
 * completed run of a survey — the answers keyed by question id.
 *
 * These are frontend-first (persisted in the browser via `surveyStore`), so the
 * shapes are deliberately serialisation-friendly (plain JSON, no Dates). When a
 * survey-service lands, this is the contract the API envelope will mirror.
 */

/** How a question is answered. */
export type SurveyQuestionType =
  | "text" // free-text (Textarea)
  | "single" // pick exactly one option
  | "multi" // pick any number of options
  | "rating" // 1..scaleMax numeric scale

export interface SurveyQuestion {
  id: string
  prompt: string
  type: SurveyQuestionType
  /** Choices for `single` / `multi` questions. Ignored for `text` / `rating`. */
  options?: string[]
  /** Upper bound for a `rating` scale (default 5). Ignored for other types. */
  scaleMax?: number
  /** When true, the taker cannot submit until this question is answered. */
  required?: boolean
}

export interface Survey {
  id: string
  title: string
  description?: string
  questions: SurveyQuestion[]
  /** ISO timestamps. */
  createdAt: string
  updatedAt: string
}

/** A single answer value — shape depends on the question type. */
export type SurveyAnswerValue = string | string[] | number | null

export interface SurveyResponse {
  id: string
  surveyId: string
  /** questionId -> answer value. */
  answers: Record<string, SurveyAnswerValue>
  submittedAt: string
}

/** Human labels for the question types (builder dropdown + take view). */
export const SURVEY_QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  text: "Short / long text",
  single: "Single choice",
  multi: "Multiple choice",
  rating: "Rating scale",
}

/** The default upper bound for a new rating question. */
export const DEFAULT_RATING_SCALE_MAX = 5
