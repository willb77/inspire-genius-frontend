import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  RehearsalAnswerResult,
  RehearsalDeleted,
  RehearsalNarrationJob,
  RehearsalSession,
  RehearsalStart,
  RehearsalStored,
} from "@/types/direction-setting"

/**
 * Stage 12 — Rehearse. The client for the eight rehearsal routes.
 *
 * Like the rest of Direction Setting these live on the Agent Engine, so they go
 * through `getApi()`/`agentApi` — never the monolith `api` instance.
 * `/v1/agents/*` is the only prefix API Gateway routes to the engine; a bare
 * `/v1/...` path falls through to the monolith and 404s in the browser while
 * passing every test.
 *
 * ## This stage inverts the async pattern of stages 6, 9 and 10
 *
 * There, the compute is the slow part, so the stage is accept-then-poll and the
 * answer only exists after the poll finishes. Here the thing the person came for
 * — feedback on what they just said — is a database write and a deterministic
 * read of their own text. It comes back **in the POST response**:
 *
 *     POST /rehearsal/sessions             -> start, or resume an unfinished one
 *     GET  /rehearsal                      -> current session + the stage-12 artefact
 *     POST /rehearsal/sessions/{id}/answers-> answer; the feedback is in the reply
 *     POST /rehearsal/sessions/{id}/finish -> stop early, keeping what is there
 *     POST /rehearsal/sessions/{id}/sharing-> opt in / out of coach visibility
 *     DELETE /rehearsal/sessions/{id}      -> delete, and mean it
 *     GET  /rehearsal/jobs/{jobId}         -> poll the OPTIONAL prose rewrite
 *
 * So there is exactly one poll here, `getRehearsalNarrationJob`, and it is a
 * progressive enhancement: Nova saying the same finding more warmly. **Nothing
 * waits on it.** If it never lands, the person is not missing anything — the
 * feedback they were shown was already complete and was already correct.
 *
 * Every route is self-scoped: the caller's own claims name the subject. The
 * rehearsal id in the path is a resource, not a subject, and the owner is part
 * of the server's lookup — so somebody else's id returns exactly what a
 * nonexistent one does. **404 is terminal, never retryable**: a transcript of
 * someone's weakest answers is not a thing to let callers probe for.
 */
const PREFIX = "/v1/agents/direction-setting"

const sessionUrl = (rehearsalId: string) =>
  `${PREFIX}/rehearsal/sessions/${encodeURIComponent(rehearsalId)}`

/**
 * GET /rehearsal — the read to use on mount.
 *
 * Returns `session: null` rather than a 404 when there has never been one, so an
 * untouched stage is not an error path. A session that comes back unfinished is
 * the one to resume: somebody who answered three questions on Tuesday should
 * land on question four, not on a new empty session that quietly abandons
 * Tuesday's work.
 */
export async function getRehearsal() {
  const { data } = await getApi().get<VerticalApiResponse<RehearsalStored>>(
    `${PREFIX}/rehearsal`
  )
  return data
}

/**
 * POST /rehearsal/sessions — start, or resume.
 *
 * Resuming is the default. `fresh: true` is the explicit "go again", which opens
 * a second rehearsal and leaves the first alone — rehearsing twice is the point
 * of the stage, so several sessions per person is expected, not a leak.
 *
 * `canRehearse: false` comes back as a 200 with an explanation when there is no
 * interview guide on file. That is not an error and must not be rendered as one.
 */
export async function startRehearsal(fresh = false) {
  const { data } = await getApi().post<VerticalApiResponse<RehearsalStart>>(
    `${PREFIX}/rehearsal/sessions`,
    { fresh }
  )
  return data
}

/**
 * POST /rehearsal/sessions/{id}/answers — answer the current question.
 *
 * No question id in the body: the server knows which question is next, and
 * taking one from the client would let a stale tab answer the wrong question.
 *
 * **An empty string is a legitimate answer.** "Nothing came out" happens, and it
 * happens most on the questions that matter; the backend has its own kind
 * response for it. Do not gate this call behind a non-empty textarea.
 *
 * 409 on a finished rehearsal — the server refuses rather than appending a turn
 * nobody would ever be shown.
 */
export async function answerRehearsalQuestion(
  rehearsalId: string,
  answer: string
) {
  const { data } = await getApi().post<VerticalApiResponse<RehearsalAnswerResult>>(
    `${sessionUrl(rehearsalId)}/answers`,
    { answer }
  )
  return data
}

/**
 * POST /rehearsal/sessions/{id}/finish — stop here, keeping what is there.
 *
 * Always allowed, and always completes. There is no `abandoned` status: stage 12
 * is optional, the value of it is the practice already done, and telling
 * somebody they left it unfinished would be telling them they failed at the one
 * stage that cannot be failed.
 */
export async function finishRehearsal(rehearsalId: string) {
  const { data } = await getApi().post<VerticalApiResponse<RehearsalSession>>(
    `${sessionUrl(rehearsalId)}/finish`,
    {}
  )
  return data
}

/**
 * POST /rehearsal/sessions/{id}/sharing — opt in to, or back out of, coach
 * visibility.
 *
 * `shared` is required and has no default on either side of the wire, because a
 * defaulted boolean on a sharing endpoint is how opt-in becomes opt-out by
 * accident. Off unless the owner turns it on, and only the owner can reach this.
 */
export async function setRehearsalSharing(rehearsalId: string, shared: boolean) {
  const { data } = await getApi().post<VerticalApiResponse<RehearsalSession>>(
    `${sessionUrl(rehearsalId)}/sharing`,
    { shared }
  )
  return data
}

/**
 * DELETE /rehearsal/sessions/{id} — the row goes.
 *
 * Not a flag, not a tombstone, not an archive. The stage-12 artefact never held
 * the answers, so there is no second copy to strand, and its pointer to this
 * session is cleared as part of the delete. Offer it plainly, and confirm before
 * calling it: it cannot be undone precisely because it is honest.
 */
export async function deleteRehearsal(rehearsalId: string) {
  const { data } = await getApi().delete<VerticalApiResponse<RehearsalDeleted>>(
    sessionUrl(rehearsalId)
  )
  return data
}

/**
 * GET /rehearsal/jobs/{jobId} — poll the optional rewrite.
 *
 * The one job in this stage, and the one call whose failure costs nothing. It
 * asks Nova to re-say feedback the person has already read, in warmer words, and
 * the server throws the rewrite away whole if it comes back carrying a figure or
 * reading as an assessment. So every unhappy path here — a 404, an error, a job
 * that never completes, `applied: false` — leaves the surface exactly as correct
 * as it was. **Never gate the UI on this.**
 */
export async function getRehearsalNarrationJob(jobId: string) {
  const { data } = await getApi().get<VerticalApiResponse<RehearsalNarrationJob>>(
    `${PREFIX}/rehearsal/jobs/${encodeURIComponent(jobId)}`
  )
  return data
}
