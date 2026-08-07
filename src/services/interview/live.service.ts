/**
 * Live Interview service — REAL scored candidate interviews run by a manager
 * or practitioner interviewer.
 *
 * The candidate is NOT the signed-in user. Backed by the agent-engine
 * `/v1/agents/interview/live/session*` routes (all 404 when the server-side
 * `live_interview_scoring` flag is off — the caller degrades to an error
 * state, never a crash). Reached via `agentApi` — the Agent Engine instance,
 * same one `interview.service.ts` / `practice.service.ts` use.
 */
import { agentApi } from "@/lib/agentApi"
import type { InterviewFrame } from "@/services/interview/practice.service"

/** Recording/consent mode for the interview. Default is `no_audio`. */
export type ConsentMode = "audio" | "no_audio"

export type LiveConsent = {
  captured: boolean
  mode: ConsentMode
  /** How the acknowledgement was captured, e.g. "in_app_ack". */
  method?: string
}

/** The candidate being interviewed — never the signed-in interviewer. */
export type LiveCandidate = {
  display_name: string
  external_id?: string
}

/** One planned question, as returned by the backend's ordered session plan. */
export type LivePlanQuestion = {
  competency_id: string
  section: string
  question: string
  /** Human-readable competency label, when the backend provides one. */
  competency_label?: string
  star_probes?: string[]
}

export type LiveSession = {
  session_id: string
  frame?: InterviewFrame
  candidate?: LiveCandidate
  consent?: LiveConsent
  status?: string
  created_at?: string
  finalized_at?: string
}

export type StarEvidenceField = { present: boolean; note?: string }

export type StarEvidence = {
  S: StarEvidenceField
  T: StarEvidenceField
  A: StarEvidenceField
  R: StarEvidenceField
}

/**
 * One answer in the session. `suggested_score` + `star_evidence` are the
 * ADVISORY AI read — never authoritative. `final_score` + `interviewer_notes`
 * are the interviewer's own rating, set via {@link liveInterviewService.scoreAnswer}
 * (PATCH) — that is the value of record.
 */
export type LiveAnswer = {
  answer_id: string
  competency_id: string
  section?: string
  question_text?: string
  captured_answer: string
  suggested_score: number | null
  star_evidence: StarEvidence
  /** True when the advisory suggestion was capped (e.g. missing STAR elements). */
  capped?: boolean
  final_score?: number | null
  interviewer_notes?: string
}

export type SectionScore = {
  section: string
  score: number
  count?: number
}

export type FinalizeResult = {
  session: LiveSession
  answers: LiveAnswer[]
  section_scores: SectionScore[]
  overall_score: number
  overall_mean: number
  recommendation: string
}

export type GetSessionResult = {
  session: LiveSession
  answers: LiveAnswer[]
}

export type CreateLiveSessionPayload = {
  frame: InterviewFrame
  candidate: LiveCandidate
  consent: LiveConsent
}

export type CreateLiveSessionResult = {
  session_id: string
  plan: LivePlanQuestion[]
}

export type SubmitAnswerPayload = {
  competency_id: string
  captured_answer: string
  question_text?: string
}

export type SubmitAnswerResult = {
  answer_id: string
  suggested_score: number | null
  star_evidence: StarEvidence
  capped?: boolean
}

export type ScoreAnswerPayload = {
  final_score: number
  interviewer_notes?: string
  star_evidence?: StarEvidence
}

const BASE = "/v1/agents/interview/live/session"

export const liveInterviewService = {
  async createSession(payload: CreateLiveSessionPayload): Promise<CreateLiveSessionResult> {
    const { data } = await agentApi.post<CreateLiveSessionResult>(BASE, payload)
    return data
  },

  async submitAnswer(sessionId: string, payload: SubmitAnswerPayload): Promise<SubmitAnswerResult> {
    const { data } = await agentApi.post<SubmitAnswerResult>(`${BASE}/${sessionId}/answer`, payload)
    return data
  },

  async scoreAnswer(
    sessionId: string,
    answerId: string,
    payload: ScoreAnswerPayload,
  ): Promise<LiveAnswer> {
    const { data } = await agentApi.patch<LiveAnswer>(
      `${BASE}/${sessionId}/answer/${answerId}`,
      payload,
    )
    return data
  },

  async finalize(sessionId: string): Promise<FinalizeResult> {
    const { data } = await agentApi.post<FinalizeResult>(`${BASE}/${sessionId}/finalize`)
    return data
  },

  async getSession(sessionId: string): Promise<GetSessionResult> {
    const { data } = await agentApi.get<GetSessionResult>(`${BASE}/${sessionId}`)
    return data
  },
}
