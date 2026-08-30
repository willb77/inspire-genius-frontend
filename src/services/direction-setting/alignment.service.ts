import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  AlignmentJob,
  AlignmentJobStarted,
  AlignmentStored,
} from "@/types/direction-setting"

/**
 * Stage 6 — Align. The client for the three alignment routes.
 *
 * Like the rest of Direction Setting these live on the Agent Engine, so they go
 * through `getApi()`/`agentApi` — never the monolith `api` instance.
 * `/v1/agents/*` is the only prefix API Gateway routes to the engine; a bare
 * `/v1/...` path falls through to the monolith and 404s in the browser while
 * passing every test.
 *
 * ## Why this stage is three calls and not one
 *
 * Computing the report hydrates a full behavioural profile, reads the shared
 * Summit goal store, and scores every stated goal against nine role families.
 * That does not fit inside API Gateway's **30-second hard cap**, so the stage is
 * on the async job path: accept the work, return, come back for the answer.
 *
 *     POST /alignment/jobs        -> 202 {jobId, status: "queued"}
 *     GET  /alignment/jobs/{id}   -> {status, result?, error?}   (poll to terminal)
 *     GET  /alignment             -> {result, job}               (the cheap read)
 *
 * All three are **self-scoped**: the caller's own claims name the subject, so
 * there is no id to pass and none to tamper with.
 */
const PREFIX = "/v1/agents/direction-setting"

/**
 * GET /alignment — the last stored result plus the latest job's status.
 *
 * The read to use on mount. It answers "never run" / "running right now" /
 * "failed" / "here it is" in one call, and returns `result: null` rather than a
 * 404 when nothing has been computed yet — so an untouched stage is not an
 * error path.
 */
export async function getAlignment() {
  const { data } = await getApi().get<VerticalApiResponse<AlignmentStored>>(
    `${PREFIX}/alignment`
  )
  return data
}

/**
 * POST /alignment/jobs — accept the compute, 202 immediately.
 *
 * The queued row is written server-side *before* the worker is spawned, so the
 * id in the response is pollable the instant it arrives. There is no race to
 * wait out before the first poll.
 */
export async function startAlignmentJob() {
  const { data } = await getApi().post<VerticalApiResponse<AlignmentJobStarted>>(
    `${PREFIX}/alignment/jobs`,
    {}
  )
  return data
}

/**
 * GET /alignment/jobs/{jobId} — poll one job.
 *
 * **404 is a normal outcome, not a fault.** Jobs are owner-scoped, and a job
 * belonging to somebody else is indistinguishable here from an id that never
 * existed — deliberately, so ids cannot be probed. Callers must treat a 404 as
 * terminal and stop polling rather than retrying into an infinite spinner.
 */
export async function getAlignmentJob(jobId: string) {
  const { data } = await getApi().get<VerticalApiResponse<AlignmentJob>>(
    `${PREFIX}/alignment/jobs/${encodeURIComponent(jobId)}`
  )
  return data
}
