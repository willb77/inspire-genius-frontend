import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import i18n from "i18next";

import { getApi } from "@/lib/agentApi";
import type { MeridianResponse } from "@/hooks/agents/useMeridianWebSocket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobStatus = "queued" | "running" | "complete" | "error";

export type JobMetadata = {
  contributing_agents?: string[];
  synthesized?: boolean;
  rag_sources?: { filename: string; similarity: number; document_id?: string }[];
  domain?: string;
  latency_ms?: number;
  assistant_message_id?: string;
  // IG Core document-generation skill — files produced this turn (each with a
  // presigned download URL). Flows through the async-job path automatically via
  // the catch-all below; typed here for the consumers that read it.
  attachments?: {
    kind: string;
    filename: string;
    url: string;
    format?: string;
    content_type?: string;
    size_bytes?: number;
    expires_in?: number;
  }[];
  // The server is allowed to round-trip arbitrary additional keys.
  [key: string]: unknown;
};

export type ChatJob = {
  job_id: string;
  session_id: string;
  status: JobStatus;
  message: string;
  content?: string | null;
  agent?: string | null;
  metadata?: JobMetadata;
  error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  /**
   * Set only when THIS client settled the job as an error without a
   * server verdict: ``"deadline"`` (still not terminal after
   * ``pollTimeoutMs``) or ``"poll_failures"`` (``maxPollFailures``
   * consecutive failed reads). A job settled this way stays settled: a
   * late answer, by push or poll, is dropped (settle-once). Absent on
   * every server-sourced job.
   */
  client_settled?: "deadline" | "poll_failures";
};

type StartJobInput = {
  message: string;
  sessionId: string;
  fileIds?: string[];
  context?: Record<string, unknown>;
  systemPromptOverride?: string;
};

type StartJobResult = {
  job_id: string;
  status: JobStatus;
  session_id: string;
};

export type UseMeridianJobOptions = {
  /**
   * Called when the job reaches a terminal state (``complete`` or
   * ``error``).  The hook also keeps the job in its internal map so
   * consumers can render history; this callback is purely for
   * side-effects (e.g. swapping the in-flight bubble for the final
   * answer).
   */
  onJobSettled?: (job: ChatJob) => void;
  /**
   * Called on every status transition (queued → running → terminal).
   * Useful for fine-grained UX (progress indicators).
   */
  onJobUpdate?: (job: ChatJob) => void;
  /**
   * Poll interval (ms) when the WS push frame hasn't arrived. Defaults
   * to 2000ms. The poll is *additive* to the WS path: as soon as the
   * push frame lands, polling stops on its own.
   */
  pollIntervalMs?: number;
  /**
   * Maximum poll duration (ms), measured from when this hook starts
   * polling the job (for a re-hydrated job, from the page load). Defaults
   * to 5 minutes. A job still not terminal at the deadline is settled
   * locally as an ``error`` with readable text (``client_settled:
   * "deadline"``), so ``onJobSettled`` fires and every consumer's error
   * branch runs, instead of a "thinking" indicator that never ends.
   */
  pollTimeoutMs?: number;
  /**
   * Consecutive failed polls (a thrown request or a 404) after which the
   * job is settled locally as an ``error`` (``client_settled:
   * "poll_failures"``). Any successful read resets the count. Defaults
   * to 5 (about 10 s at the default 2 s cadence).
   */
  maxPollFailures?: number;
};

export type UseMeridianJobReturn = {
  /** Active + historical jobs the hook is tracking (latest first). */
  jobs: ChatJob[];
  /** Convenience map keyed by job_id. */
  jobsById: Record<string, ChatJob>;
  /** POST /v1/agents/chat/async — returns the minted job_id + status. */
  startJob: (input: StartJobInput) => Promise<StartJobResult>;
  /** GET /v1/agents/chat/jobs/{job_id} — one-shot poll. */
  pollJob: (jobId: string) => Promise<ChatJob | null>;
  /**
   * GET /v1/agents/chat/jobs?session_id=... — used on MeridianChat mount
   * to hydrate in-flight bubbles after a page refresh.
   */
  listActiveJobs: (sessionId: string) => Promise<ChatJob[]>;
  /**
   * Feed an incoming WS frame into the hook.  MeridianChat already
   * wires ``useMeridianWebSocket({ onResponse })``; route any frame
   * whose ``type`` starts with ``job_`` here so the hook can short-circuit
   * polling once the push arrives.  Returns ``true`` when the frame was
   * consumed (so the caller can early-return).
   */
  notifyPushFrame: (resp: MeridianResponse) => boolean;
  /** Clear a job from the hook's state (used when the user dismisses a bubble). */
  removeJob: (jobId: string) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set<JobStatus>(["complete", "error"]);

/**
 * Retry config for the initial ``POST /v1/agents/chat/async``. The
 * acceptance endpoint must respond with 202 in <30s (API GW HTTP API
 * cap); on cold ECS tasks the chain to even accept the job can blow
 * the cap and produce "Sorry I can't reach Meridian" on the first
 * question. Retrying on 5xx + network errors with a short backoff
 * usually catches the cold-start case on attempt #2 once the task
 * is warm.
 */
const START_JOB_MAX_ATTEMPTS = 3;
const START_JOB_BACKOFF_MS = [0, 3000, 6000]; // attempts 1, 2, 3

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 5xx + network errors are retriable. 4xx (validation, auth, not-found)
 * are deterministic client-side bugs and should NOT be retried.
 */
function isRetriableStartJobError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { response?: { status?: unknown }; code?: unknown; message?: unknown };
  const status = e.response?.status;
  if (typeof status === "number") return status >= 500 && status < 600;
  // No response = network error / timeout / DNS failure / connection reset.
  // axios sets `code` like ECONNABORTED / ERR_NETWORK in this case.
  if (e.response === undefined) return true;
  return false;
}

/**
 * The user-visible text for a client-side settle. Two consumers show
 * ``job.error`` verbatim (MeridianChat's banner, Interview Practice's
 * toast), so this must read as a sentence, never a code. Resolved through
 * the i18next singleton (the ``chat`` namespace loads at init); the
 * English fallback covers an uninitialised instance, e.g. in unit tests.
 */
const CLIENT_SETTLE_TEXT: Record<NonNullable<ChatJob["client_settled"]>, { key: string; en: string }> = {
  deadline: {
    key: "meridian.jobTimedOut",
    en: "Meridian took too long to answer. Please try again.",
  },
  poll_failures: {
    key: "meridian.jobLostContact",
    en: "Lost contact with Meridian while it was answering. Please try again.",
  },
};

function clientSettleText(reason: NonNullable<ChatJob["client_settled"]>): string {
  const { key, en } = CLIENT_SETTLE_TEXT[reason];
  const text: unknown = i18n.t(key, { ns: "chat", defaultValue: en });
  return typeof text === "string" && text && text !== key ? text : en;
}

function normaliseStatus(raw: unknown): JobStatus {
  return raw === "running" || raw === "complete" || raw === "error"
    ? (raw as JobStatus)
    : "queued";
}

function asJobFromGet(body: unknown): ChatJob | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.job_id !== "string" || typeof b.session_id !== "string") return null;
  return {
    job_id: b.job_id,
    session_id: b.session_id,
    status: normaliseStatus(b.status),
    message: typeof b.message === "string" ? b.message : "",
    content: (b.content as string | null | undefined) ?? null,
    agent: (b.agent as string | null | undefined) ?? null,
    metadata: (b.metadata as JobMetadata | undefined) ?? undefined,
    error: (b.error as string | null | undefined) ?? null,
    created_at: (b.created_at as string | null | undefined) ?? null,
    updated_at: (b.updated_at as string | null | undefined) ?? null,
    completed_at: (b.completed_at as string | null | undefined) ?? null,
  };
}

function asJobFromPushFrame(resp: MeridianResponse): ChatJob | null {
  if (!resp.job_id || !resp.session_id) return null;
  const status: JobStatus =
    resp.type === "job_complete"
      ? "complete"
      : resp.type === "job_error"
        ? "error"
        : "running";
  return {
    job_id: resp.job_id,
    session_id: resp.session_id,
    status,
    // Push frames don't echo the original user message — preserve the
    // empty string and let the caller merge with their own state.
    message: "",
    content: resp.content ?? null,
    agent: resp.agent ?? null,
    metadata: (resp.metadata as JobMetadata | undefined) ?? undefined,
    error: resp.error ?? null,
    completed_at: status === "complete" || status === "error"
      ? new Date().toISOString()
      : null,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMeridianJob(
  options: UseMeridianJobOptions = {},
): UseMeridianJobReturn {
  const {
    onJobSettled,
    onJobUpdate,
    pollIntervalMs = 2000,
    pollTimeoutMs = 5 * 60_000,
    maxPollFailures = 5,
  } = options;

  const [jobsById, setJobsById] = useState<Record<string, ChatJob>>({});
  // Ref mirror of jobsById so the merge in upsertJob runs synchronously
  // without depending on React's setState-updater batching semantics.
  // The setState call is purely so React re-renders consumers; the
  // source of truth for callback dispatch is the ref.
  const jobsByIdRef = useRef<Record<string, ChatJob>>({});

  // Refs that bridge stale-closure gaps in the async helpers.
  const onJobSettledRef = useRef(onJobSettled);
  onJobSettledRef.current = onJobSettled;
  const onJobUpdateRef = useRef(onJobUpdate);
  onJobUpdateRef.current = onJobUpdate;

  // Per-job poll timers so notifyPushFrame can cancel them when a push
  // arrives, and so unmount can clean up.
  const pollTimersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pollDeadlinesRef = useRef<Record<string, number>>({});
  // Consecutive failed polls per job (a throw or a 404); reset on any read.
  const pollFailuresRef = useRef<Record<string, number>>({});

  // -------------------------------------------------------------------
  // State helpers
  // -------------------------------------------------------------------

  const upsertJob = useCallback((job: ChatJob, mergeFromCurrent = true) => {
    // Independent of the merge flag, we need to know whether the same
    // job_id is already tracked in a terminal state — that drives the
    // dedupe guard below.
    const priorEntry = jobsByIdRef.current[job.job_id];
    // Settle-once: a job this client already settled as an error (deadline
    // or poll failures) is final. A late push frame, an in-flight poll or a
    // listActiveJobs replay must neither flip it back to running nor swap
    // in a late answer next to the error the consumer has already shown.
    if (priorEntry?.client_settled) return;
    const wasTerminal = priorEntry ? TERMINAL_STATUSES.has(priorEntry.status) : false;

    const existing = mergeFromCurrent ? priorEntry : undefined;
    const merged: ChatJob = existing
      ? {
          ...existing,
          ...job,
          // Push frames lose the original `message` — keep what we have.
          message: job.message || existing.message,
          metadata: job.metadata ?? existing.metadata,
        }
      : job;
    jobsByIdRef.current = { ...jobsByIdRef.current, [job.job_id]: merged };
    setJobsById(jobsByIdRef.current);
    onJobUpdateRef.current?.(merged);
    // Only fire onJobSettled on the transition INTO terminal. A second
    // WS-push / REST-poll / listActiveJobs replay for an already-
    // terminal job_id must not re-render the assistant bubble.
    if (!wasTerminal && TERMINAL_STATUSES.has(merged.status)) {
      onJobSettledRef.current?.(merged);
    }
  }, []);

  const cancelPoll = useCallback((jobId: string) => {
    const timer = pollTimersRef.current[jobId];
    if (timer) {
      clearInterval(timer);
      delete pollTimersRef.current[jobId];
    }
    delete pollDeadlinesRef.current[jobId];
    delete pollFailuresRef.current[jobId];
  }, []);

  /**
   * Settle a still-in-flight job as an error on this client's own
   * authority. Fires ``onJobSettled`` through ``upsertJob``, so every
   * consumer's existing error branch renders it. No-op for a job that is
   * no longer tracked (removed) or already terminal.
   */
  const settleLocally = useCallback(
    (jobId: string, reason: NonNullable<ChatJob["client_settled"]>) => {
      cancelPoll(jobId);
      const prior = jobsByIdRef.current[jobId];
      if (!prior || TERMINAL_STATUSES.has(prior.status)) return;
      upsertJob({
        ...prior,
        status: "error",
        error: clientSettleText(reason),
        completed_at: new Date().toISOString(),
        client_settled: reason,
      });
    },
    [cancelPoll, upsertJob],
  );

  // -------------------------------------------------------------------
  // Network
  // -------------------------------------------------------------------

  const pollJob = useCallback(async (jobId: string): Promise<ChatJob | null> => {
    try {
      const api = getApi();
      const resp = await api.get(`/v1/agents/chat/jobs/${jobId}`);
      const job = asJobFromGet(resp.data);
      if (job) upsertJob(job);
      return job;
    } catch (err) {
      // 404 means the job was either never minted or doesn't belong to
      // this user; both look the same from here on purpose. Log + skip.
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 404
      ) {
        return null;
      }
      throw err;
    }
  }, [upsertJob]);

  const startPolling = useCallback(
    (jobId: string) => {
      if (pollTimersRef.current[jobId]) return;
      pollDeadlinesRef.current[jobId] = Date.now() + pollTimeoutMs;

      const tick = async () => {
        // Polling was cancelled (push settled it, removeJob, unmount).
        if (!(jobId in pollDeadlinesRef.current)) return;
        if (Date.now() > pollDeadlinesRef.current[jobId]) {
          settleLocally(jobId, "deadline");
          return;
        }
        const job = await pollJob(jobId).catch(() => null);
        // Cancelled while the request was in flight: nothing to count.
        if (!(jobId in pollDeadlinesRef.current)) return;
        if (job) {
          pollFailuresRef.current[jobId] = 0;
          if (TERMINAL_STATUSES.has(job.status)) cancelPoll(jobId);
          return;
        }
        // A throw or a 404 (pollJob returns null for both a 404 and a body
        // it cannot parse). A 404 is not transient; a run of throws is a
        // lost connection. Either way the turn must end visibly.
        const failures = (pollFailuresRef.current[jobId] ?? 0) + 1;
        pollFailuresRef.current[jobId] = failures;
        if (failures >= maxPollFailures) settleLocally(jobId, "poll_failures");
      };

      // Fire immediately so a fast complete is reflected without waiting
      // a full interval.
      void tick();
      pollTimersRef.current[jobId] = setInterval(() => {
        void tick();
      }, pollIntervalMs);
    },
    [cancelPoll, maxPollFailures, pollIntervalMs, pollJob, pollTimeoutMs, settleLocally],
  );

  const startJob = useCallback(
    async (input: StartJobInput): Promise<StartJobResult> => {
      const api = getApi();
      const payload: Record<string, unknown> = {
        message: input.message,
        session_id: input.sessionId,
      };
      // A9 / I18N-6c: tell the server which language the UI is RENDERING
      // (resolvedLanguage, not the raw localStorage tag, which can be an
      // unsupported "es-MX"). Just a language code, nothing private. The
      // backend ignores it unless its reply-language flag is on, and then
      // validates it against an allowlist; an explicit caller value wins.
      // Imported from "i18next" (the singleton) rather than "@/lib/i18n", whose
      // import runs init() as a side effect inside every test that loads this hook.
      const uiLanguage = i18n.resolvedLanguage;
      if (input.context || uiLanguage) {
        payload.context = {
          ...(uiLanguage ? { ui_language: uiLanguage } : {}),
          ...(input.context ?? {}),
        };
      }
      if (input.fileIds && input.fileIds.length > 0) payload.file_ids = input.fileIds;
      if (input.systemPromptOverride) {
        payload.system_prompt_override = input.systemPromptOverride;
      }

      // Retry-with-backoff on the initial 202 acceptance. The first
      // question after a quiet period often hits a cold ECS task whose
      // accept-the-job chain takes >30s — API GW returns 503 and the
      // user sees "Sorry I can't reach Meridian". Once the task is warm
      // a second attempt 3s later almost always succeeds.
      let respData: unknown = null;
      let gotResponse = false;
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < START_JOB_MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) await delay(START_JOB_BACKOFF_MS[attempt]);
        try {
          const resp = await api.post("/v1/agents/chat/async", payload);
          respData = resp.data;
          gotResponse = true;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (!isRetriableStartJobError(err)) throw err;
          // Retry on 5xx / network errors. If we've exhausted attempts,
          // fall through to the throw below.
        }
      }
      if (!gotResponse) throw lastErr ?? new Error("chat-async request failed");

      const data = (respData ?? {}) as Partial<StartJobResult>;
      const jobId = typeof data.job_id === "string" ? data.job_id : "";
      const sessionId = typeof data.session_id === "string" ? data.session_id : input.sessionId;
      const status = normaliseStatus(data.status);
      if (!jobId) throw new Error("chat-async response missing job_id");

      const queued: ChatJob = {
        job_id: jobId,
        session_id: sessionId,
        status,
        message: input.message,
      };
      upsertJob(queued, /* mergeFromCurrent */ false);
      startPolling(jobId);
      return { job_id: jobId, session_id: sessionId, status };
    },
    [startPolling, upsertJob],
  );

  const listActiveJobs = useCallback(
    async (sessionId: string): Promise<ChatJob[]> => {
      const api = getApi();
      const resp = await api.get("/v1/agents/chat/jobs", {
        params: { session_id: sessionId },
      });
      const items = Array.isArray(resp.data) ? resp.data : [];
      const jobs = items
        .map((row) => asJobFromGet(row))
        .filter((j): j is ChatJob => j !== null)
        // Settle-once: a job this client already settled as an error is not
        // "active" here, even while the server row still says running (an
        // orphan). Returning it would re-render a "thinking" bubble that
        // nothing would ever clear.
        .filter((j) => !jobsByIdRef.current[j.job_id]?.client_settled);
      // Hydrate state + ensure polling resumes for anything still in flight.
      for (const job of jobs) {
        upsertJob(job, /* mergeFromCurrent */ false);
        if (!TERMINAL_STATUSES.has(job.status)) startPolling(job.job_id);
      }
      return jobs;
    },
    [startPolling, upsertJob],
  );

  const notifyPushFrame = useCallback(
    (resp: MeridianResponse): boolean => {
      if (
        resp.type !== "job_complete" &&
        resp.type !== "job_progress" &&
        resp.type !== "job_error"
      ) {
        return false;
      }
      const pushed = asJobFromPushFrame(resp);
      if (!pushed) return true; // consumed-but-invalid; don't fall through
      upsertJob(pushed);
      if (TERMINAL_STATUSES.has(pushed.status)) {
        cancelPoll(pushed.job_id);
      }
      return true;
    },
    [cancelPoll, upsertJob],
  );

  const removeJob = useCallback(
    (jobId: string) => {
      cancelPoll(jobId);
      if (!(jobId in jobsByIdRef.current)) return;
      const next = { ...jobsByIdRef.current };
      delete next[jobId];
      jobsByIdRef.current = next;
      setJobsById(next);
    },
    [cancelPoll],
  );

  // -------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------

  useEffect(() => {
    // Snapshot the ref so the cleanup closure doesn't read it at unmount
    // time (when the ref may already have been mutated by other paths).
    const timers = pollTimersRef.current;
    return () => {
      for (const jobId of Object.keys(timers)) cancelPoll(jobId);
    };
  }, [cancelPoll]);

  // -------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------

  const jobs = useMemo(() => {
    return Object.values(jobsById).sort((a, b) => {
      const ta = a.created_at ?? "";
      const tb = b.created_at ?? "";
      return tb.localeCompare(ta);
    });
  }, [jobsById]);

  return useMemo(
    () => ({
      jobs,
      jobsById,
      startJob,
      pollJob,
      listActiveJobs,
      notifyPushFrame,
      removeJob,
    }),
    [jobs, jobsById, startJob, pollJob, listActiveJobs, notifyPushFrame, removeJob],
  );
}
