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
  /** Where this question came from: the curated pack, or the base bank. */
  source?: "employer" | "sector" | "bank"
  /** Coaching guidance for a curated question (interviewer-side only). */
  strongAnswerCovers?: string
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
  /** WHO decided `final_score`.
   *
   * `null` = nobody yet. The row is seeded with the advisory suggestion (or a
   * literal 3) at insert, so `final_score` alone cannot tell a rating apart
   * from a seed — which is why finalize used to average both. Read this, never
   * `final_score`, to decide whether an answer has been rated.
   *
   * `"human"` the interviewer PATCHed it · `"model"` the suggestion was
   * deliberately adopted on the self-run practice path. */
  final_source?: "human" | "model" | null
  interviewer_notes?: string
}

export type SectionScore = {
  section: string
  score: number
  count?: number
}

/**
 * The backend scorer returns `section_scores` as an OBJECT keyed by section —
 * `{ vision: { mean, weight, weighted }, ... }` — not an array. Older/other
 * shapes (a plain array of {section, score}) may also appear. Consumers must go
 * through {@link normalizeSectionScores} rather than assuming a shape, or the
 * findings screen white-screens (`section_scores.map is not a function`).
 */
export type SectionScoreDetail = {
  mean?: number
  score?: number
  weighted?: number
  weight?: number
  count?: number
}
export type SectionScoresRaw =
  | Record<string, SectionScoreDetail>
  | SectionScore[]
  | null
  | undefined

/**
 * Advisory narrative write-up attached at finalize (Interview Studio + live).
 * LLM-synthesized, fail-open — `generated: false` with empty fields when the
 * synthesis was unavailable. NEVER part of the deterministic score.
 */
export type InterviewFeedback = {
  generated: boolean
  summary: string
  strengths: string[]
  development_areas: string[]
  per_section: Record<string, string>
}

/** One answer the score was NOT built from. Named, not merely counted. */
export type UnratedAnswer = {
  answer_id: string
  competency_id: string
  question_text?: string
}

export type FinalizeResult = {
  session: LiveSession
  answers: LiveAnswer[]
  /** Answers excluded from the score because nobody rated them. Absent on
   * older backends — treat as []. A silent exclusion would read as a complete
   * scorecard that quietly omits whatever nobody got round to rating. */
  unrated?: UnratedAnswer[]
  rated_count?: number
  answer_count?: number
  section_scores: SectionScoresRaw
  overall_score: number
  overall_mean: number
  recommendation: string
  /** Advisory narrative — present on Studio + live finalize; may be absent. */
  feedback?: InterviewFeedback
}

/** Coerce whatever the backend sent for `section_scores` into a display array. */
export function normalizeSectionScores(raw: SectionScoresRaw): SectionScore[] {
  if (!raw) return []
  const pickScore = (v: SectionScoreDetail | number): number => {
    if (typeof v === "number") return v
    return v.score ?? v.mean ?? v.weighted ?? 0
  }
  if (Array.isArray(raw)) {
    return raw
      .filter(Boolean)
      .map((s) => ({ section: String(s.section ?? ""), score: pickScore(s), count: s.count }))
  }
  return Object.entries(raw).map(([section, v]) => ({
    section,
    score: pickScore(v as SectionScoreDetail),
    count: (v as SectionScoreDetail)?.count,
  }))
}

/** One row of the Past interviews / manager board list. */
export type LiveSessionSummary = {
  id: string
  interviewer_sub: string
  org_id?: string | null
  candidate_ref?: { display_name?: string; external_id?: string; candidate_hash?: string }
  requisition_id?: string | null
  requisition_label?: string | null
  frame?: InterviewFrame & { mode?: string; kind?: string }
  status: string
  overall_score?: number | null
  recommendation?: string | null
  created_at?: string | null
  finalized_at?: string | null
}

export type ListSessionsResult = {
  sessions: LiveSessionSummary[]
  total: number
  limit: number
  offset: number
  /**
   * Whether the caller's token carried an org claim.
   *
   * NOT decoration. `org_id` is written from the token at create time and
   * existing sessions have it NULL, so an org-scoped read matches nothing and
   * a company-admin sees only their own sessions. An empty list means
   * something different depending on this flag, and the UI has to say which —
   * otherwise "no interviews yet" and "we never recorded the org" look
   * identical.
   */
  org_scope_applied: boolean
}

export type ListSessionsParams = {
  mode?: string
  status?: string
  requisitionId?: string
  limit?: number
  offset?: number
}

export type GetSessionResult = {
  session: LiveSession
  answers: LiveAnswer[]
}

export type CreateLiveSessionPayload = {
  frame: InterviewFrame
  candidate: LiveCandidate
  consent: LiveConsent
  /** The role opening, sent TOP-LEVEL (not inside the frame) because that is
   * where the backend reads it — `_CreateLiveSessionBody.requisition_id`. */
  requisitionId?: string
  requisitionLabel?: string
}

/**
 * Why the plan looks the way it does.
 *
 * `applied: false` with a `reason` is the important case: a failed role rewrite
 * used to fall back to the base questions silently, which reads exactly like a
 * role that simply is not very specific.
 */
export type LiveTailoringMeta = {
  requested: boolean
  applied: boolean
  reason:
    | "no_role_title"
    | "tailoring_unavailable"
    | "tailoring_error"
    | "custom_mode_not_tailored"
    | null
}

/** Curated employer/sector pack provenance, when one applied. */
export type LiveEmployerMeta = {
  kind: "employer" | "sector"
  slug: string
  name: string
  sector?: string
  framework?: string
  coachingNote?: string
  provenance: string
}

export type CreateLiveSessionResult = {
  session_id: string
  plan: LivePlanQuestion[]
  /** Present since the employer-pack wiring; absent on older backends. */
  employer?: LiveEmployerMeta | null
  tailoring?: LiveTailoringMeta | null
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
/** The LIST route is a sibling of BASE, not a child of it — spelled out rather
 * than built as `${BASE}s`, which reads like a typo. */
const LIST = "/v1/agents/interview/live/sessions"

export const liveInterviewService = {
  async createSession(payload: CreateLiveSessionPayload): Promise<CreateLiveSessionResult> {
    // The wire contract is snake_case at the top level. Blank stays UNDEFINED
    // rather than becoming "": the column means "no opening recorded", and an
    // empty string would group every un-keyed session together as if they
    // shared one.
    const { requisitionId, requisitionLabel, ...rest } = payload
    const body: Record<string, unknown> = { ...rest }
    if (requisitionId?.trim()) body.requisition_id = requisitionId.trim()
    if (requisitionLabel?.trim()) body.requisition_label = requisitionLabel.trim()
    const { data } = await agentApi.post<CreateLiveSessionResult>(BASE, body)
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

  async listSessions(params: ListSessionsParams = {}): Promise<ListSessionsResult> {
    // `session_status`, not `status` — the route's own parameter name; `status`
    // collides with FastAPI's imported `status` module in that file.
    const { data } = await agentApi.get<ListSessionsResult>(LIST, {
      params: {
        mode: params.mode,
        session_status: params.status,
        requisition_id: params.requisitionId,
        limit: params.limit,
        offset: params.offset,
      },
    })
    return data
  },

  async abandonSession(sessionId: string): Promise<{ session: LiveSessionSummary }> {
    const { data } = await agentApi.post<{ session: LiveSessionSummary }>(
      `${BASE}/${sessionId}/abandon`,
    )
    return data
  },

  async getSession(sessionId: string): Promise<GetSessionResult> {
    const { data } = await agentApi.get<GetSessionResult>(`${BASE}/${sessionId}`)
    return data
  },
}
