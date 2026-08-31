/**
 * Survey domain types.
 *
 * A **Survey** is an author-defined questionnaire: a title, an optional
 * description, and an ordered list of questions. A **SurveyResponse** is one
 * completed run of a survey — the answers keyed by question id.
 *
 * These mirror the survey-service API contract (camelCase JSON under the
 * `BaseApiResponse.data` envelope). Surveys are stored centrally so responses
 * aggregate across every respondent; each survey is exposed to an organization
 * by `orgId`.
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
  /** The organization this survey is exposed to. */
  orgId?: string | null
  /** Author's id (JWT sub) + resolved name/email. */
  createdBy?: string | null
  createdByName?: string | null
  createdByEmail?: string | null
  /** Availability gate — respondents only see enabled surveys. */
  enabled?: boolean
  /** ISO timestamps. */
  createdAt?: string
  updatedAt?: string
  /** How many responses exist (server-computed). */
  responseCount?: number
  /** Whether the caller may view individual responses + the compilation. */
  canViewResponses?: boolean
}

/** Create/update payload sent to the service. */
export interface SurveyInput {
  title: string
  description?: string
  questions: SurveyQuestion[]
  /** Expose to this org. Omit to default to the author's org (server-resolved). */
  orgId?: string | null
  /** Availability toggle. Omit on update to leave unchanged. */
  enabled?: boolean
}

/** A single answer value — shape depends on the question type. */
export type SurveyAnswerValue = string | string[] | number | null

export interface SurveyResponse {
  id: string
  surveyId: string
  /** questionId -> answer value. */
  answers: Record<string, SurveyAnswerValue>
  respondentSub?: string | null
  /** Who answered (server-resolved). */
  respondentName?: string | null
  respondentEmail?: string | null
  submittedAt?: string
}

/** Per-question aggregate in a survey's compilation. */
export interface QuestionSummary {
  questionId: string
  prompt: string
  type: SurveyQuestionType
  answered: number
  /** single/multi: option -> count. */
  optionCounts: Record<string, number>
  /** rating: mean of submitted values. */
  average?: number | null
  /** rating: value -> count histogram. */
  ratingCounts: Record<string, number>
  /** text: every free-text answer. */
  textAnswers: string[]
}

/** The compilation across every response to a survey. */
export interface SurveySummary {
  surveyId: string
  title: string
  responseCount: number
  questions: QuestionSummary[]
}

/** Result of the AI-assisted upload/paste → draft parse. */
export interface SurveyParseResult {
  title: string
  description?: string | null
  questions: SurveyQuestion[]
  /** "llm" when the model structured it, "heuristic" for the deterministic parser. */
  source: string
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
