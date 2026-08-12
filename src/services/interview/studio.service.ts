/**
 * Interview Studio service — flexible, scored interviews an interviewer
 * (manager / super-admin / practitioner) runs with their OWN question set,
 * not the fixed STAR competency bank.
 *
 * Two question sources feed the SAME live-interview pipeline
 * (`liveInterviewService` create/submit/score/finalize):
 *   1. a custom list the interviewer types, or
 *   2. a themed set generated from a topic (e.g. a career counselor's "student
 *      discovery interview") via `POST /v1/agents/interview/live/generate`.
 *
 * The session is created with `frame.mode = "custom"`; the backend builds the
 * plan from `frame.questions`, scores with the generic (non-STAR) config, and
 * bands per `frame.kind` (hiring vs general). All routes 404 when the
 * server-side `live_interview_scoring` flag is off. Reached via `agentApi`.
 */
import { agentApi } from "@/lib/agentApi"

/** Non-hiring vs hiring banding + narrative tone. Default `general`. */
export type InterviewKind = "general" | "hiring"

/** One question in the studio editor / the plan we submit. */
export type StudioQuestion = {
  /** The question text. */
  text: string
  /** Optional theme/section label (grouped in the scored write-up). */
  theme?: string
  /** Optional stable id (else the backend assigns one). */
  id?: string
  /** Optional follow-up probes for the interviewer. */
  probes?: string[]
}

/** One generated question, as the backend returns it (plan-shaped bank). */
export type GeneratedQuestion = {
  id: string
  competency: string
  question: string
  starProbes: string[]
}

export type GeneratedSection = {
  key: string
  title: string
  competencies: GeneratedQuestion[]
}

export type GeneratedQuestionSet = {
  /** True when the LLM produced the set; false = static discovery fallback. */
  generated: boolean
  topic: string
  purpose?: string | null
  audience?: string | null
  sections: GeneratedSection[]
  totalQuestions: number
}

export type GenerateQuestionsPayload = {
  topic: string
  purpose?: string
  audience?: string
  num_questions?: number
}

const GENERATE = "/v1/agents/interview/live/generate"

export const studioInterviewService = {
  /**
   * Generate a themed interview question set from a topic. Never throws on the
   * server for an LLM failure — the backend returns a static discovery set with
   * `generated: false`.
   */
  async generateQuestions(payload: GenerateQuestionsPayload): Promise<GeneratedQuestionSet> {
    const { data } = await agentApi.post<GeneratedQuestionSet>(GENERATE, payload)
    return data
  },
}

/** Flatten a generated set into the editable studio question list. */
export function generatedSetToQuestions(set: GeneratedQuestionSet): StudioQuestion[] {
  return set.sections.flatMap((s) =>
    s.competencies.map((c) => ({
      text: c.question,
      theme: s.title,
      probes: c.starProbes,
    })),
  )
}
