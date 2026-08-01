import { useCallback, useEffect, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getPlan,
  getPlanJob,
  getRoi,
  getRoiJob,
  startPlanJob,
  startRoiJob,
} from "@/services/direction-setting/plan.service"
import type {
  DirectionJobStarted,
  DirectionJobStatus,
  PlanResultPayload,
  PlanStartInput,
  RoiResultPayload,
  RoiStartInput,
} from "@/types/direction-setting"

/**
 * Stages 9 and 10 — the two hooks the plan surface consumes.
 *
 * Both stages are accept-then-poll, for the reason spelled out in
 * `plan.service.ts`: the arithmetic is trivial but each stage makes a
 * specialist call on the way, and an unbounded call does not fit inside API
 * Gateway's 30-second cap.
 *
 * The machine is `useDirectionJob` below — the same one `useAlignment` runs,
 * written once here rather than a third time. It hands the page a single
 * `phase` plus a result:
 *
 *     loading -> idle -> waiting -> ready
 *                          \-> failed
 *                          \-> lost      (the job id is gone or not ours)
 *
 * Three things about the polling are deliberate and are the reason this is not
 * a `setInterval`:
 *
 * 1. **React Query owns the timer.** `refetchInterval` returns `false` the
 *    moment the status is terminal, and the query stops when its last observer
 *    unmounts. A hand-rolled interval has to reimplement both, and keeps
 *    ticking after the page is gone.
 * 2. **`retry: false` on the poll.** The informative failure is a 404 — jobs
 *    are owner-scoped, so someone else's id and an id that never existed are
 *    the same answer by design. Retrying a 404 turns a knowable end state into
 *    an infinite spinner.
 * 3. **The cheap read comes first.** `GET /plan` and `GET /roi` return the last
 *    stored artefact *and* the latest job's status, so a returning user
 *    reattaches to a run already in flight instead of paying for a second
 *    compute.
 *
 * ## A refusing ROI is `ready`, not `failed`
 *
 * Stage 10's ordinary output is `roi: null` with a populated `missing`. That is
 * a **complete** job carrying a successful result, and this hook reports it as
 * `ready` with the payload attached. Deciding whether the numbers can be shown
 * is the surface's job — `RoiSummary` refuses on `roi === null` *or* a
 * non-empty `missing` — and it cannot make that call if the transport has
 * already relabelled a refusal as an error.
 */

/** How often to poll a live job. Fast enough to feel live, slow enough to be free. */
export const PLAN_POLL_MS = 2500

const TERMINAL_STATUSES: readonly DirectionJobStatus[] = ["complete", "error"]

/** Once a job reaches one of these, nothing more will be written to it. */
export function isTerminalJobStatus(
  status: DirectionJobStatus | string | null | undefined
): boolean {
  return TERMINAL_STATUSES.includes(status as DirectionJobStatus)
}

export const planKeys = {
  all: ["direction-setting", "plan"] as const,
  stored: ["direction-setting", "plan", "stored"] as const,
  job: (jobId: string) => ["direction-setting", "plan", "job", jobId] as const,
}

export const roiKeys = {
  all: ["direction-setting", "roi"] as const,
  stored: ["direction-setting", "roi", "stored"] as const,
  job: (jobId: string) => ["direction-setting", "roi", "job", jobId] as const,
}

/**
 * Mirrors `journeyKeys.journey`. Written out rather than imported so this hook
 * carries no dependency on the journey module for a single cache key.
 */
const JOURNEY_KEY: QueryKey = ["direction-setting", "journey"]

/**
 * What the surface is currently looking at.
 *
 * `lost` is separated from `failed` on purpose. A job that errored has a reason
 * worth showing; a job id that no longer resolves has nothing to say except
 * "start again", and dressing that up as a failure invites the user to read it
 * as their fault.
 */
export type DirectionJobPhase =
  | "loading"
  | "idle"
  | "waiting"
  | "ready"
  | "failed"
  | "lost"

/** The job row minus its result — what both the poll and the cheap read carry. */
type JobView = {
  jobId: string
  kind: string
  status: DirectionJobStatus
  error?: string | null
}

type JobWire<TResult> = JobView & { result?: TResult | null }

type StoredWire<TResult> = {
  result: TResult | null
  job: JobView | null
}

export type UseDirectionJobOptions = {
  /** Poll cadence in ms. Overridable so tests need not wait on real seconds. */
  pollMs?: number
}

export type UseDirectionJobResult<TResult, TInput> = {
  phase: DirectionJobPhase
  /** The artefact, from the live job if one just finished, else the stored one. */
  result: TResult | null
  /** Status of the most recent job — live poll first, then the mount read. */
  jobStatus: DirectionJobStatus | null
  /** The backend's own message when a job failed. Never a stack trace. */
  jobError: string | null
  /** True while the 202 is in flight, before there is a job id to poll. */
  isStarting: boolean
  /** Kick off a fresh compute. */
  start: (input?: TInput) => void
  /**
   * True when the mount read itself failed. Distinct from a failed job: we do
   * not know whether an artefact exists, so the surface should say so rather
   * than claim there is nothing.
   */
  storedFailed: boolean
}

type DirectionJobConfig<TResult, TInput> = {
  storedKey: QueryKey
  jobKey: (jobId: string) => QueryKey
  fetchStored: () => Promise<StoredWire<TResult> | undefined>
  fetchJob: (jobId: string) => Promise<JobWire<TResult> | undefined>
  begin: (input: TInput) => Promise<DirectionJobStarted | undefined>
  emptyInput: TInput
  pollMs: number
}

/**
 * The accept-then-poll machine, shared by both stages.
 *
 * Deliberately not exported. Stages 9 and 10 differ only in their routes and
 * their payload type, and the two public hooks below are the supported surface
 * — a third caller wiring its own routes through here would be a new stage
 * bypassing the review that gives a stage its copy.
 */
function useDirectionJob<TResult, TInput>({
  storedKey,
  jobKey,
  fetchStored,
  fetchJob,
  begin,
  emptyInput,
  pollMs,
}: DirectionJobConfig<TResult, TInput>): UseDirectionJobResult<TResult, TInput> {
  const qc = useQueryClient()
  const [jobId, setJobId] = useState<string | null>(null)

  /* The cheap read. `retry: false` because "nothing computed yet" comes back as
     a 200 with `result: null`, so a genuine failure here is a real fault worth
     surfacing immediately rather than retrying behind a spinner. */
  const stored = useQuery<StoredWire<TResult> | undefined, AxiosError>({
    queryKey: storedKey,
    queryFn: fetchStored,
    retry: false,
    staleTime: 30 * 1000,
  })

  /* Reattach to a run still in flight. Someone who started this, wandered off
     and came back gets the wait they left, not a duplicate compute. */
  const storedJob = stored.data?.job ?? null
  const inFlightId =
    storedJob && !isTerminalJobStatus(storedJob.status) ? storedJob.jobId : null

  useEffect(() => {
    if (inFlightId && !jobId) setJobId(inFlightId)
  }, [inFlightId, jobId])

  const job = useQuery<JobWire<TResult> | undefined, AxiosError>({
    queryKey: jobKey(jobId ?? ""),
    queryFn: () => fetchJob(jobId as string),
    enabled: jobId !== null,
    // A 404 means the id is gone or was never ours. Both are terminal.
    retry: false,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false
      return isTerminalJobStatus(query.state.data?.status) ? false : pollMs
    },
  })

  /* A finished job has moved the world on: the stage artefact is written and the
     journey has advanced. Re-read both rather than patching the cache — the
     server derives what comes next, and this surface should not second-guess it. */
  const liveStatus = job.data?.status
  useEffect(() => {
    if (liveStatus === "complete") {
      void qc.invalidateQueries({ queryKey: storedKey })
      void qc.invalidateQueries({ queryKey: JOURNEY_KEY })
    }
    // `storedKey` is a stable module-level tuple; listing it would not change
    // when this runs, and spreading it into the deps would.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveStatus, qc])

  const startJob = useMutation<
    DirectionJobStarted | undefined,
    AxiosError,
    TInput
  >({
    mutationFn: (input) => begin(input),
    onSuccess: (data) => {
      if (!data?.jobId) return
      // Drop any cached state under this id before observing it, so a re-run
      // can never render the previous run's terminal status for a tick.
      qc.removeQueries({ queryKey: jobKey(data.jobId) })
      setJobId(data.jobId)
    },
  })

  const {
    mutate: startMutate,
    isPending: isStarting,
    isError: startFailed,
  } = startJob

  const start = useCallback(
    (input?: TInput) => {
      if (isStarting) return
      startMutate(input ?? emptyInput)
    },
    [emptyInput, isStarting, startMutate]
  )

  /* Once a job is being polled, **only that job's own status counts**. The mount
     read's job view is the fallback for before there is one — and the instant a
     re-run starts it becomes a stale view of a different job, which would flash
     the previous run's terminal state over a compute that has only just begun. */
  const liveJob = jobId !== null ? job.data ?? null : null
  const latestJob: JobView | null =
    liveJob ?? (jobId === null ? storedJob : null)
  const jobStatus = latestJob?.status ?? null

  /* Prefer the live result: after a re-run the stored artefact is, for a moment,
     still the previous one. */
  const result = job.data?.result ?? stored.data?.result ?? null

  const lost =
    job.isError && (job.error as AxiosError | null)?.response?.status === 404

  /* Order matters, and each step earns its place:
       - a 202 in flight outranks whatever the last run did;
       - `lost` is split out of `failed` before either is reported;
       - an errored poll must not fall through to `waiting`, or the spinner never
         stops — the exact failure the poll path exists to avoid. */
  let phase: DirectionJobPhase
  if (stored.isLoading) {
    phase = "loading"
  } else if (isStarting) {
    phase = "waiting"
  } else if (lost) {
    phase = "lost"
  } else if (job.isError || startFailed || jobStatus === "error") {
    phase = "failed"
  } else if (jobId !== null && !isTerminalJobStatus(jobStatus)) {
    phase = "waiting"
  } else if (result) {
    phase = "ready"
  } else {
    phase = "idle"
  }

  return {
    phase,
    result,
    jobStatus,
    jobError: latestJob?.error ?? null,
    isStarting,
    start,
    storedFailed: stored.isError,
  }
}

const NO_PLAN_INPUT: PlanStartInput = {}
const NO_ROI_INPUT: RoiStartInput = {}

/**
 * Stage 9 — the sequenced plan.
 *
 * `result.sequence` arrives **already ordered**: critical gaps first, then
 * coaching, largest miss first within a tier. That order is the product
 * decision the stage exists to make, and it is computed against severity
 * rankings the surface does not hold. Render it as given.
 */
export function usePlan({ pollMs = PLAN_POLL_MS }: UseDirectionJobOptions = {}) {
  return useDirectionJob<PlanResultPayload, PlanStartInput>({
    storedKey: planKeys.stored,
    jobKey: planKeys.job,
    fetchStored: async () => (await getPlan()).data,
    fetchJob: async (jobId) => (await getPlanJob(jobId)).data,
    begin: async (input) => (await startPlanJob(input)).data,
    emptyInput: NO_PLAN_INPUT,
    pollMs,
  })
}

/**
 * Stage 10 — is it worth it?
 *
 * `start({ currentIncome })` is how the one input nothing on this platform
 * knows gets stated. Omitting it is a refusal and the ROI will say so; sending
 * `0` states that there is no income right now, and computes.
 */
export function useRoi({ pollMs = PLAN_POLL_MS }: UseDirectionJobOptions = {}) {
  return useDirectionJob<RoiResultPayload, RoiStartInput>({
    storedKey: roiKeys.stored,
    jobKey: roiKeys.job,
    fetchStored: async () => (await getRoi()).data,
    fetchJob: async (jobId) => (await getRoiJob(jobId)).data,
    begin: async (input) => (await startRoiJob(input)).data,
    emptyInput: NO_ROI_INPUT,
    pollMs,
  })
}
