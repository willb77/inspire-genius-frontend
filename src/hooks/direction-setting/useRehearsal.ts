import { useCallback, useEffect, useMemo, useState } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  answerRehearsalQuestion,
  deleteRehearsal,
  finishRehearsal,
  getRehearsal,
  getRehearsalNarrationJob,
  setRehearsalSharing,
  startRehearsal,
} from "@/services/direction-setting/rehearsal.service"
import type {
  DirectionJobStatus,
  RehearsalAnswerResult,
  RehearsalArtefact,
  RehearsalDeleted,
  RehearsalFeedback,
  RehearsalNarrationJob,
  RehearsalSession,
  RehearsalStart,
  RehearsalStored,
  RehearsalTurn,
} from "@/types/direction-setting"

/**
 * Stage 12 — Rehearse. The one hook the rehearsal surface consumes.
 *
 * The shape of this stage is the inverse of stages 6, 9 and 10, and the hook is
 * built around that inversion:
 *
 * - **The main loop is synchronous.** Answering is a POST that returns the
 *   feedback. There is no job to wait on, no spinner between saying something
 *   and hearing back about it, and no polling in the path the person is actually
 *   walking. The mutation's response is written straight into the session cache.
 * - **The only poll is optional in the strongest sense.** Nova re-saying that
 *   same feedback more warmly is a job; if it never lands, nothing is missing,
 *   because the wording already on screen was complete when it arrived. So the
 *   poll never gates a phase, never shows a spinner, and its every failure path
 *   — 404, error, `applied: false` — is a no-op that leaves the surface correct.
 *   It quietly swaps the text in if it arrives, and that is all.
 *
 * Three other things are deliberate:
 *
 * 1. **Resume, don't restart.** `GET /rehearsal` on mount returns an unfinished
 *    session, and the surface reattaches to it. Somebody who answered three
 *    questions on Tuesday lands on question four. Starting a *second* rehearsal
 *    is a separate, explicit act (`start(true)`) — and a legitimate one, since
 *    rehearsing twice is the point of the stage.
 * 2. **404 is terminal.** Rehearsals are owner-scoped, so someone else's id and
 *    an id that never existed are the same answer by design. `retry: false`
 *    everywhere, and a 404 from an action moves the surface to `gone` rather
 *    than into a retry loop over somebody's transcript.
 * 3. **No derived measurement.** This hook exposes the server's own strings and
 *    the server's own cursor. It composes no score, no percentage and no
 *    "answered well" count, because the backend composes none and inventing one
 *    here would rebuild the evaluation tool stage 12 exists not to be.
 */

/** How often to poll the optional rewrite. Nobody is waiting, so this is gentle. */
export const REHEARSAL_POLL_MS = 2500

const TERMINAL_STATUSES: readonly DirectionJobStatus[] = ["complete", "error"]

/** Once a narration job reaches one of these, nothing more will be written to it. */
export function isTerminalNarrationStatus(
  status: DirectionJobStatus | string | null | undefined
): boolean {
  return TERMINAL_STATUSES.includes(status as DirectionJobStatus)
}

export const rehearsalKeys = {
  all: ["direction-setting", "rehearsal"] as const,
  current: ["direction-setting", "rehearsal", "current"] as const,
  narration: (jobId: string) =>
    ["direction-setting", "rehearsal", "narration", jobId] as const,
}

/**
 * Mirrors `journeyKeys.journey`. Written out rather than imported so this hook
 * carries no dependency on the journey module for a single cache key.
 */
const JOURNEY_KEY: QueryKey = ["direction-setting", "journey"]

/**
 * What the surface is currently looking at.
 *
 * `unavailable` is not a failure and must not be rendered as one: it is what
 * somebody who reached stage 12 before stage 11 gets, and the note that comes
 * with it names the interview guide they have not built yet.
 *
 * `gone` is separated from `failed` for the same reason `lost` is in
 * `useAlignment`: a session that is no longer there has nothing to say except
 * "start again", and dressing that up as an error invites the person to read a
 * deletion they asked for as something breaking.
 */
export type RehearsalPhase =
  | "loading"
  | "idle"
  | "unavailable"
  | "active"
  | "complete"
  | "gone"
  | "failed"

export type UseRehearsalOptions = {
  /** Poll cadence in ms for the optional rewrite. Overridable for tests. */
  pollMs?: number
}

export type UseRehearsalResult = {
  phase: RehearsalPhase
  /** The live session — questions frozen at start, cursor derived server-side. */
  session: RehearsalSession | null
  /** The question to put in front of the person right now. */
  currentQuestion: RehearsalSession["currentQuestion"]
  /** The most recently answered turn, if any. */
  lastTurn: RehearsalTurn | null
  /**
   * Feedback for `lastTurn`, with Nova's warmer wording swapped in if it landed.
   * Identical in shape either way — the surface never has to know which it got.
   */
  lastFeedback: RehearsalFeedback | null
  /** What stage 12 kept in the journey. Never contains answers or feedback. */
  artefact: RehearsalArtefact | null
  /**
   * The server's own explanation when there is nothing to rehearse against, or
   * when the feedback will not be able to close with a self-advocacy line.
   * Plain language, already written for the person. Render it as-is.
   */
  note: string | null
  /** True when the person has just deleted a transcript, for one render pass. */
  justDeleted: boolean
  isStarting: boolean
  isAnswering: boolean
  isFinishing: boolean
  isDeleting: boolean
  isSavingSharing: boolean
  /** Open a rehearsal. `fresh` starts a second one rather than resuming. */
  start: (fresh?: boolean) => void
  /** Answer the current question. An empty string is a legitimate answer. */
  answer: (text: string) => void
  /** Stop here, keeping what has been answered. Always allowed. */
  finish: () => void
  /** Opt this transcript in to — or back out of — coach visibility. */
  setSharing: (shared: boolean) => void
  /** Delete the transcript. Confirm before calling: it does not come back. */
  remove: () => void
  /** A human-readable problem with the last action, or null. Never a stack. */
  actionError: string | null
}

const statusOf = (error: unknown): number | undefined =>
  (error as AxiosError | null)?.response?.status

/** Narration overrides are keyed per session, so a second rehearsal starts clean. */
const narrationKey = (rehearsalId: string, turnIndex: number) =>
  `${rehearsalId}:${turnIndex}`

export function useRehearsal(
  { pollMs = REHEARSAL_POLL_MS }: UseRehearsalOptions = {}
): UseRehearsalResult {
  const qc = useQueryClient()

  /* `canRehearse: false` is only knowable from a start attempt — `GET /rehearsal`
     cannot tell "never started" from "no guide to start against". Held locally
     rather than faked into the cache, because it describes an attempt, not state. */
  const [startInfo, setStartInfo] = useState<{
    canRehearse: boolean
    note: string | null
  } | null>(null)
  const [narrationJobId, setNarrationJobId] = useState<string | null>(null)
  const [narrations, setNarrations] = useState<Record<string, RehearsalFeedback>>({})
  const [gone, setGone] = useState(false)
  const [justDeleted, setJustDeleted] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  /* The mount read. `retry: false` because "never rehearsed" comes back as a 200
     with `session: null`, so a genuine failure here is a real fault worth
     surfacing rather than retrying behind a spinner. */
  const stored = useQuery<RehearsalStored | undefined, AxiosError>({
    queryKey: rehearsalKeys.current,
    queryFn: async () => (await getRehearsal()).data,
    retry: false,
    staleTime: 30 * 1000,
  })

  const session = stored.data?.session ?? null
  const artefact = stored.data?.result ?? null

  /** Write a session the server just returned straight into the mount read's cache. */
  const putSession = useCallback(
    (next: RehearsalSession | null) => {
      qc.setQueryData<RehearsalStored>(rehearsalKeys.current, (prev) => ({
        result: prev?.result ?? null,
        session: next,
      }))
    },
    [qc]
  )

  /* A completed rehearsal has moved the world on: the stage-12 artefact is
     written and the journey has advanced. Re-read both rather than patching the
     cache — the server derives what comes next, and this surface should not
     second-guess it. */
  const refreshCompletion = useCallback(() => {
    void qc.invalidateQueries({ queryKey: rehearsalKeys.current })
    void qc.invalidateQueries({ queryKey: JOURNEY_KEY })
  }, [qc])

  const startMutation = useMutation<
    RehearsalStart | undefined,
    AxiosError,
    boolean
  >({
    mutationFn: async (fresh) => (await startRehearsal(fresh)).data,
    onSuccess: (data) => {
      if (!data) return
      setGone(false)
      setJustDeleted(false)
      setActionError(null)
      setNarrationJobId(null)
      setStartInfo({ canRehearse: data.canRehearse, note: data.note })
      // A brand new session must not inherit the previous one's rewrites.
      if (!data.resumed) setNarrations({})
      if (data.session) putSession(data.session)
    },
    onError: () => setActionError("We couldn't open a rehearsal just now."),
  })

  const answerMutation = useMutation<
    RehearsalAnswerResult | undefined,
    AxiosError,
    string
  >({
    mutationFn: async (text) => {
      if (!session) throw new Error("no rehearsal to answer")
      return (await answerRehearsalQuestion(session.rehearsalId, text)).data
    },
    onSuccess: (data) => {
      if (!data) return
      setActionError(null)
      putSession(data.session)
      // Start watching the optional rewrite. Nothing waits on it.
      if (data.narrationJobId) setNarrationJobId(data.narrationJobId)
      if (data.session.status === "complete") refreshCompletion()
    },
    onError: (error) => {
      const status = statusOf(error)
      if (status === 404) {
        setGone(true)
        putSession(null)
        return
      }
      if (status === 409) {
        // The server says this rehearsal is already finished. It is right.
        setActionError("This rehearsal is already finished.")
        refreshCompletion()
        return
      }
      setActionError("That answer didn't save. Try it again — nothing was lost.")
    },
  })

  const finishMutation = useMutation<
    RehearsalSession | undefined,
    AxiosError,
    void
  >({
    mutationFn: async () => {
      if (!session) throw new Error("no rehearsal to finish")
      return (await finishRehearsal(session.rehearsalId)).data
    },
    onSuccess: (data) => {
      setActionError(null)
      if (data) putSession(data)
      refreshCompletion()
    },
    onError: (error) => {
      if (statusOf(error) === 404) {
        setGone(true)
        putSession(null)
        return
      }
      setActionError("We couldn't close that off just now.")
    },
  })

  const sharingMutation = useMutation<
    RehearsalSession | undefined,
    AxiosError,
    boolean
  >({
    mutationFn: async (shared) => {
      if (!session) throw new Error("no rehearsal to share")
      return (await setRehearsalSharing(session.rehearsalId, shared)).data
    },
    onSuccess: (data) => {
      setActionError(null)
      if (data) putSession(data)
    },
    onError: (error) => {
      if (statusOf(error) === 404) {
        setGone(true)
        putSession(null)
        return
      }
      // Say which way it failed: "we couldn't change it" must never leave
      // somebody believing they turned sharing off when they did not.
      setActionError("That didn't save — sharing is unchanged.")
    },
  })

  const deleteMutation = useMutation<
    RehearsalDeleted | undefined,
    AxiosError,
    void
  >({
    mutationFn: async () => {
      if (!session) throw new Error("no rehearsal to delete")
      return (await deleteRehearsal(session.rehearsalId)).data
    },
    onSuccess: () => {
      setActionError(null)
      setStartInfo(null)
      setNarrationJobId(null)
      setNarrations({})
      setJustDeleted(true)
      putSession(null)
      refreshCompletion()
    },
    onError: (error) => {
      if (statusOf(error) === 404) {
        // Already gone. Nothing to apologise for.
        setJustDeleted(true)
        putSession(null)
        return
      }
      setActionError("We couldn't delete that just now. It is still there.")
    },
  })

  /* The optional rewrite. `retry: false` and a `refetchInterval` that stops at a
     terminal status, so this can never become a permanent timer over a job that
     nobody is waiting for. */
  const narration = useQuery<RehearsalNarrationJob | undefined, AxiosError>({
    queryKey: rehearsalKeys.narration(narrationJobId ?? ""),
    queryFn: async () =>
      (await getRehearsalNarrationJob(narrationJobId as string)).data,
    enabled: narrationJobId !== null,
    retry: false,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false
      return isTerminalNarrationStatus(query.state.data?.status) ? false : pollMs
    },
  })

  /* Swap the warmer wording in, if and only if it actually landed. `applied:
     false` is a success — the transcript was deleted before the rewrite arrived,
     which is the delete button working — and it changes nothing on screen. */
  const narrationResult =
    narration.data?.status === "complete" ? narration.data.result ?? null : null
  const rehearsalId = session?.rehearsalId ?? null

  useEffect(() => {
    if (!rehearsalId || !narrationResult?.applied) return
    const { feedback, turnIndex } = narrationResult
    if (!feedback || typeof turnIndex !== "number") return
    const key = narrationKey(rehearsalId, turnIndex)
    setNarrations((prev) => (prev[key] ? prev : { ...prev, [key]: feedback }))
  }, [narrationResult, rehearsalId])

  const lastTurn = useMemo(() => {
    const turns = session?.turns ?? []
    return turns.length ? turns[turns.length - 1] : null
  }, [session])

  const lastFeedback = useMemo(() => {
    if (!session || !lastTurn) return null
    return (
      narrations[narrationKey(session.rehearsalId, lastTurn.index)] ??
      lastTurn.feedback ??
      null
    )
  }, [narrations, session, lastTurn])

  const start = useCallback(
    (fresh = false) => {
      if (startMutation.isPending) return
      startMutation.mutate(fresh)
    },
    [startMutation]
  )

  const answer = useCallback(
    (text: string) => {
      if (!session || answerMutation.isPending) return
      answerMutation.mutate(text)
    },
    [answerMutation, session]
  )

  const finish = useCallback(() => {
    if (!session || finishMutation.isPending) return
    finishMutation.mutate()
  }, [finishMutation, session])

  const setSharing = useCallback(
    (shared: boolean) => {
      if (!session || sharingMutation.isPending) return
      sharingMutation.mutate(shared)
    },
    [session, sharingMutation]
  )

  const remove = useCallback(() => {
    if (!session || deleteMutation.isPending) return
    deleteMutation.mutate()
  }, [deleteMutation, session])

  /* Order matters, and each step earns its place:
       - `gone` is decided before anything tries to render a session that isn't
         there;
       - `unavailable` outranks `idle`, so somebody with no interview guide reads
         the explanation rather than a Start button that will not work;
       - a session's own status decides `active` vs `complete`, because the
         server owns that machine and this surface does not re-derive it. */
  let phase: RehearsalPhase
  if (stored.isLoading) {
    phase = "loading"
  } else if (gone) {
    phase = "gone"
  } else if (stored.isError) {
    phase = "failed"
  } else if (session) {
    phase = session.status === "complete" ? "complete" : "active"
  } else if (startInfo && !startInfo.canRehearse) {
    phase = "unavailable"
  } else {
    phase = "idle"
  }

  return {
    phase,
    session,
    currentQuestion: session?.currentQuestion ?? null,
    lastTurn,
    lastFeedback,
    artefact,
    note: startInfo?.note ?? null,
    justDeleted,
    isStarting: startMutation.isPending,
    isAnswering: answerMutation.isPending,
    isFinishing: finishMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSavingSharing: sharingMutation.isPending,
    start,
    answer,
    finish,
    setSharing,
    remove,
    actionError,
  }
}
