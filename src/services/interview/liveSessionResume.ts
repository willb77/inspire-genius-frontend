/**
 * Rehydration for a reopened or resumed live/studio interview — package IS-C
 * Lane B.
 *
 * Pure functions over what `GET /live/session/{id}` returns, deliberately kept
 * out of the two bodies: they were forked verbatim from one another, so
 * anything written twice drifts, and this is the logic that decides whether a
 * resumed interview keeps its ratings.
 */
import type {
  FinalizeResult,
  GetSessionResult,
  LiveAnswer,
  LivePlanQuestion,
  SubmitAnswerResult,
} from "@/services/interview/live.service"

/** The bodies' per-competency answer state. Mirrors their local `AnswerState`. */
export type RehydratedAnswer = {
  suggestion: SubmitAnswerResult | null
  scored: LiveAnswer | null
}

export type RehydratedSession = {
  plan: LivePlanQuestion[]
  answers: Record<string, RehydratedAnswer>
  /** Where to continue: the first planned question with no answer row. */
  startIndex: number
  /** True when every planned question already has an answer. */
  complete: boolean
}

/**
 * Turn a stored session into the interview screen's state.
 *
 * Two rules that are easy to get wrong, and both change what the interviewer
 * sees:
 *
 * 1. `scored` is set ONLY when `final_source` says a human decided the score.
 *    Every answer row is seeded with `final_score` at insert, so trusting
 *    `final_score` alone would show a resumed interview as fully rated when
 *    nobody has rated anything — the exact confusion IS-4 added the column to
 *    end. Pre-IS-4 rows (`final_source` NULL) therefore resume as UNRATED, and
 *    are never back-filled: inventing the decider is worse than admitting the
 *    interview predates the record.
 * 2. `suggestion.answer_id` must survive, or the PATCH that saves a rating has
 *    no id to send and drops out silently.
 */
export function rehydrateSession(detail: GetSessionResult): RehydratedSession {
  const answers: Record<string, RehydratedAnswer> = {}
  for (const a of detail.answers) {
    answers[a.competency_id] = {
      suggestion: {
        answer_id: a.answer_id,
        suggested_score: a.suggested_score ?? null,
        star_evidence: a.star_evidence,
        capped: a.capped,
      },
      scored: a.final_source ? a : null,
    }
  }
  const plan = detail.plan
  const firstUnanswered = plan.findIndex((q) => !answers[q.competency_id])
  return {
    plan,
    answers,
    startIndex: firstUnanswered === -1 ? Math.max(0, plan.length - 1) : firstUnanswered,
    complete: firstUnanswered === -1 && plan.length > 0,
  }
}

/**
 * Rebuild the findings payload for a session that was already finalized.
 *
 * Reopen NEVER calls `/finalize` again. That is not merely a preference: the
 * roll-up is the record of a decision the interviewer already made, and
 * re-running it against today's answers could quietly produce a different
 * number for an interview a candidate was already judged on. The backend now
 * refuses (409) as well — this is the client honouring the same rule rather
 * than discovering it.
 *
 * `unrated` is recomputed from the stored answers rather than remembered,
 * because a pre-IS-4 session has NO decider on any answer: it reopens showing
 * every answer as not decided, which is what actually happened.
 */
export function finalizeResultFromDetail(detail: GetSessionResult): FinalizeResult {
  const rated = detail.answers.filter((a) => a.final_source)
  const unrated = detail.answers
    .filter((a) => !a.final_source)
    .map((a) => ({
      answer_id: a.answer_id,
      competency_id: a.competency_id,
      question_text: a.question_text,
    }))
  const scores = rated
    .map((a) => (typeof a.final_score === "number" ? a.final_score : null))
    .filter((n): n is number => n !== null)
  const mean = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0
  return {
    session: detail.session,
    answers: detail.answers,
    unrated,
    rated_count: rated.length,
    answer_count: detail.answers.length,
    section_scores: detail.section_scores,
    // The STORED roll-up, not a recomputation. A reopened interview must show
    // the number the decision was made on — and NULL when there is none, which
    // is the case for every abandoned session. `mean` is only ever a fallback
    // for the mean line, never for the score of record.
    overall_score: detail.overall_score ?? null,
    overall_mean: detail.overall_score ?? (scores.length ? mean : null),
    recommendation: detail.recommendation ?? "No recommendation was recorded.",
    feedback: detail.feedback ?? undefined,
  }
}
