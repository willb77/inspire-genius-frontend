import { useCallback, useEffect, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getAlignment,
  getAlignmentJob,
  startAlignmentJob,
} from "@/services/direction-setting/alignment.service"
import type {
  AlignmentJob,
  AlignmentJobStarted,
  AlignmentJobStatus,
  AlignmentResultPayload,
  AlignmentStored,
} from "@/types/direction-setting"

/**
 * Stage 6 — Align. The one hook the alignment surface consumes.
 *
 * The stage cannot answer inside a request (nine role families scored against a
 * freshly hydrated behavioural profile, well past API Gateway's 30-second cap),
 * so it is accept-then-poll. This hook owns the whole of that dance and hands
 * the page a single `phase` plus a report:
 *
 *     loading -> idle -> waiting -> ready
 *                          \-> failed
 *                          \-> lost      (the job id is gone or not ours)
 *
 * Three things about the polling are deliberate:
 *
 * 1. **React Query owns the timer, not us.** `refetchInterval` returns `false`
 *    the moment the status is terminal, and the query stops when its last
 *    observer unmounts. A hand-rolled `setInterval` would have to reimplement
 *    both, and would keep ticking after the page was gone.
 * 2. **`retry: false` on the poll.** The informative failure here is a 404 —
 *    jobs are owner-scoped, so someone else's id and an id that never existed
 *    are the same answer by design. Retrying a 404 turns a knowable end state
 *    into an infinite spinner.
 * 3. **The cheap read comes first.** `GET /alignment` on mount returns the last
 *    stored report *and* the latest job's status, so a returning user reattaches
 *    to a run already in flight instead of paying for a second compute, and
 *    someone who has done this before reads their report without recomputing it.
 */

/** How often to poll a live job. Fast enough to feel live, slow enough to be free. */
export const ALIGNMENT_POLL_MS = 2500

const TERMINAL_STATUSES: readonly AlignmentJobStatus[] = ["complete", "error"]

/** Once a job reaches one of these, nothing more will be written to it. */
export function isTerminalAlignmentStatus(
  status: AlignmentJobStatus | string | null | undefined
): boolean {
  return TERMINAL_STATUSES.includes(status as AlignmentJobStatus)
}

export const alignmentKeys = {
  all: ["direction-setting", "alignment"] as const,
  stored: ["direction-setting", "alignment", "stored"] as const,
  job: (jobId: string) =>
    ["direction-setting", "alignment", "job", jobId] as const,
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
export type AlignmentPhase =
  | "loading"
  | "idle"
  | "waiting"
  | "ready"
  | "failed"
  | "lost"

export type UseAlignmentOptions = {
  /** Poll cadence in ms. Overridable so tests need not wait on real seconds. */
  pollMs?: number
}

export type UseAlignmentResult = {
  phase: AlignmentPhase
  /** The report, from the live job if one just finished, else the stored one. */
  report: AlignmentResultPayload | null
  /** Status of the most recent job — live poll first, then the mount read. */
  jobStatus: AlignmentJobStatus | null
  /** The backend's own message when a job failed. Never a stack trace. */
  jobError: string | null
  /** True while the 202 is in flight, before there is a job id to poll. */
  isStarting: boolean
  /** Kick off a fresh compute. */
  start: () => void
  /**
   * True when the mount read itself failed. Distinct from a failed job: we do
   * not know whether a report exists, so the surface should say so rather than
   * claim there is nothing.
   */
  storedFailed: boolean
}

export function useAlignment(
  { pollMs = ALIGNMENT_POLL_MS }: UseAlignmentOptions = {}
): UseAlignmentResult {
  const qc = useQueryClient()
  const [jobId, setJobId] = useState<string | null>(null)

  /* The cheap read. `retry: false` because "nothing computed yet" comes back as
     a 200 with `result: null`, so a genuine failure here is a real fault worth
     surfacing immediately rather than retrying behind a spinner. */
  const stored = useQuery<AlignmentStored | undefined, AxiosError>({
    queryKey: alignmentKeys.stored,
    queryFn: async () => (await getAlignment()).data,
    retry: false,
    staleTime: 30 * 1000,
  })

  /* Reattach to a run still in flight. Someone who started this, wandered off
     and came back gets the wait they left, not a duplicate compute. */
  const storedJob = stored.data?.job ?? null
  const inFlightId =
    storedJob && !isTerminalAlignmentStatus(storedJob.status)
      ? storedJob.jobId
      : null

  useEffect(() => {
    if (inFlightId && !jobId) setJobId(inFlightId)
  }, [inFlightId, jobId])

  const job = useQuery<AlignmentJob | undefined, AxiosError>({
    queryKey: alignmentKeys.job(jobId ?? ""),
    queryFn: async () => (await getAlignmentJob(jobId as string)).data,
    enabled: jobId !== null,
    // A 404 means the id is gone or was never ours. Both are terminal.
    retry: false,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false
      return isTerminalAlignmentStatus(query.state.data?.status) ? false : pollMs
    },
  })

  /* A finished job has moved the world on: the stage-6 artefact is written and
     the journey has advanced. Re-read both rather than patching the cache — the
     server derives what comes next, and this surface should not second-guess it. */
  const liveStatus = job.data?.status
  useEffect(() => {
    if (liveStatus === "complete") {
      void qc.invalidateQueries({ queryKey: alignmentKeys.stored })
      void qc.invalidateQueries({ queryKey: JOURNEY_KEY })
    }
  }, [liveStatus, qc])

  const startJob = useMutation<AlignmentJobStarted | undefined, AxiosError, void>({
    mutationFn: async () => (await startAlignmentJob()).data,
    onSuccess: (data) => {
      if (!data?.jobId) return
      // Drop any cached state under this id before observing it, so a re-run
      // can never render the previous run's terminal status for a tick.
      qc.removeQueries({ queryKey: alignmentKeys.job(data.jobId) })
      setJobId(data.jobId)
    },
  })

  const { mutate: startMutate, isPending: isStarting, isError: startFailed } = startJob
  const start = useCallback(() => {
    if (isStarting) return
    startMutate()
  }, [isStarting, startMutate])

  /* Once a job is being polled, **only that job's own status counts**. The mount
     read's job view is the fallback for before there is one — and the instant a
     re-run starts it becomes a stale view of a different job, which would flash
     the previous run's terminal state over a compute that has only just begun. */
  const liveJob = jobId !== null ? job.data ?? null : null
  const latestJob: Pick<AlignmentJob, "status" | "error"> | null =
    liveJob ?? (jobId === null ? storedJob : null)
  const jobStatus = latestJob?.status ?? null

  /* Prefer the live result: after a re-run the stored artefact is, for a moment,
     still the previous report. */
  const report = job.data?.result ?? stored.data?.result ?? null

  const lost =
    job.isError && (job.error as AxiosError | null)?.response?.status === 404

  /* Order matters, and each step earns its place:
       - a 202 in flight outranks whatever the last run did;
       - `lost` is split out of `failed` before either is reported;
       - an errored poll must not fall through to `waiting`, or the spinner never
         stops — the exact failure the poll path exists to avoid. */
  let phase: AlignmentPhase
  if (stored.isLoading) {
    phase = "loading"
  } else if (isStarting) {
    phase = "waiting"
  } else if (lost) {
    phase = "lost"
  } else if (job.isError || startFailed || jobStatus === "error") {
    phase = "failed"
  } else if (jobId !== null && !isTerminalAlignmentStatus(jobStatus)) {
    phase = "waiting"
  } else if (report) {
    phase = "ready"
  } else {
    phase = "idle"
  }

  return {
    phase,
    report,
    jobStatus,
    jobError: latestJob?.error ?? null,
    isStarting,
    start,
    storedFailed: stored.isError,
  }
}
