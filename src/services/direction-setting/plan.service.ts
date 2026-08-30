import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  DirectionJobStarted,
  PlanJob,
  PlanStartInput,
  PlanStored,
  RoiJob,
  RoiStartInput,
  RoiStored,
} from "@/types/direction-setting"

/**
 * Stages 9 and 10 — plan and ROI. The client for six routes.
 *
 * Agent Engine, so `getApi()`/`agentApi` — never the monolith `api`. Only
 * `/v1/agents/*` reaches the engine through API Gateway; a bare `/v1/...` path
 * falls through to the monolith and 404s in the browser while passing every
 * test.
 *
 * ## Why both stages poll
 *
 * Neither computation is slow. Stage 9's sequencing is a sort over gaps the fit
 * engine already produced; stage 10's arithmetic is twenty lines of division.
 * What is unbounded is the **specialist call** each one makes on the way — Echo
 * naming the skill items concretely, and the framing prose on the ROI — and an
 * unbounded call does not fit inside API Gateway's 30-second hard cap. A route
 * that answers in 200ms nine times out of ten and 502s on the tenth is worse
 * than one that always polls, so both join stage 6 on the job path with the
 * same shape and the same poller.
 *
 *     POST /plan/jobs        -> 202 {jobId, kind: "plan", status: "queued"}
 *     GET  /plan/jobs/{id}   -> {status, result?, error?}   (poll to terminal)
 *     GET  /plan             -> {result, job}               (the cheap read)
 *
 *     POST /roi/jobs         -> 202 {jobId, kind: "roi",  status: "queued"}
 *     GET  /roi/jobs/{id}    -> {status, result?, error?}
 *     GET  /roi              -> {result, job}
 *
 * All six are **self-scoped**: the caller's own claims name the subject. The
 * request bodies carry only what the caller is stating about their *own* plan
 * and their *own* finances — never a subject, so there is nothing to tamper
 * with.
 *
 * ## A refusing ROI is a *successful* job
 *
 * `result.roi === null` with a populated `missing` is stage 10 working exactly
 * as designed: it declined to invent an input. It arrives as a `complete` job
 * with a `200`, and treating it as a failure would send the surface down the
 * wrong branch entirely. The error path here is reserved for jobs that actually
 * broke.
 */
const PREFIX = "/v1/agents/direction-setting"

/* ── Stage 9 — plan ──────────────────────────────────────────────────────── */

/**
 * GET /plan — the last plan plus the latest job's status.
 *
 * The read to use on mount. It answers "never run" / "running right now" /
 * "failed" / "here it is" in one call, and returns `result: null` rather than a
 * 404 when nothing has been computed — so an untouched stage is not an error
 * path, and a returning user reattaches to a run already in flight instead of
 * paying for a second compute.
 */
export async function getPlan() {
  const { data } = await getApi().get<VerticalApiResponse<PlanStored>>(
    `${PREFIX}/plan`
  )
  return data
}

/**
 * POST /plan/jobs — accept the compute, 202 immediately.
 *
 * The queued row is written server-side *before* the worker is spawned, so the
 * id in the response is pollable the instant it arrives. There is no race to
 * wait out before the first poll.
 *
 * The body is optional in the ordinary case: a caller who has been through
 * stages 7 and 8 has a target role and a gap set on file already.
 */
export async function startPlanJob(input: PlanStartInput = {}) {
  const { data } = await getApi().post<VerticalApiResponse<DirectionJobStarted>>(
    `${PREFIX}/plan/jobs`,
    input
  )
  return data
}

/**
 * GET /plan/jobs/{jobId} — poll one plan job.
 *
 * **404 is a normal outcome, not a fault.** Jobs are owner-scoped, and someone
 * else's job is indistinguishable here from an id that never existed —
 * deliberately, so ids cannot be probed. Callers must treat a 404 as terminal
 * and stop polling rather than retrying into an infinite spinner.
 */
export async function getPlanJob(jobId: string) {
  const { data } = await getApi().get<VerticalApiResponse<PlanJob>>(
    `${PREFIX}/plan/jobs/${encodeURIComponent(jobId)}`
  )
  return data
}

/* ── Stage 10 — ROI ──────────────────────────────────────────────────────── */

/** GET /roi — the last ROI plus the latest job's status. Same contract as `getPlan`. */
export async function getRoi() {
  const { data } = await getApi().get<VerticalApiResponse<RoiStored>>(
    `${PREFIX}/roi`
  )
  return data
}

/**
 * POST /roi/jobs — accept the compute, 202 immediately.
 *
 * `currentIncome` has no fallback anywhere on the platform. **Omitting it is a
 * refusal** — the ROI comes back `null` with `current-income` in `missing` —
 * and that is correct: an income inferred from a résumé or a job title would be
 * invisible in the result. Sending `0` is a different thing entirely: it is a
 * *statement* that there is no income right now, which is a common answer for
 * the person this journey is built for, and it computes with the whole target
 * wage counting as uplift.
 */
export async function startRoiJob(input: RoiStartInput = {}) {
  const { data } = await getApi().post<VerticalApiResponse<DirectionJobStarted>>(
    `${PREFIX}/roi/jobs`,
    input
  )
  return data
}

/** GET /roi/jobs/{jobId} — poll one ROI job. 404 is terminal, as above. */
export async function getRoiJob(jobId: string) {
  const { data } = await getApi().get<VerticalApiResponse<RoiJob>>(
    `${PREFIX}/roi/jobs/${encodeURIComponent(jobId)}`
  )
  return data
}
