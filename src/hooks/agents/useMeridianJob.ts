import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
   * Maximum poll duration (ms). Defaults to 5 minutes. After this the
   * job is left in its last-known state and the hook stops polling.
   */
  pollTimeoutMs?: number;
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

  // -------------------------------------------------------------------
  // State helpers
  // -------------------------------------------------------------------

  const upsertJob = useCallback((job: ChatJob, mergeFromCurrent = true) => {
    const existing = mergeFromCurrent ? jobsByIdRef.current[job.job_id] : undefined;
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
    if (TERMINAL_STATUSES.has(merged.status)) {
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
  }, []);

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
        if (Date.now() > (pollDeadlinesRef.current[jobId] ?? 0)) {
          cancelPoll(jobId);
          return;
        }
        const job = await pollJob(jobId).catch(() => null);
        if (job && TERMINAL_STATUSES.has(job.status)) cancelPoll(jobId);
      };

      // Fire immediately so a fast complete is reflected without waiting
      // a full interval.
      void tick();
      pollTimersRef.current[jobId] = setInterval(() => {
        void tick();
      }, pollIntervalMs);
    },
    [cancelPoll, pollIntervalMs, pollJob, pollTimeoutMs],
  );

  const startJob = useCallback(
    async (input: StartJobInput): Promise<StartJobResult> => {
      const api = getApi();
      const payload: Record<string, unknown> = {
        message: input.message,
        session_id: input.sessionId,
      };
      if (input.context) payload.context = input.context;
      if (input.fileIds && input.fileIds.length > 0) payload.file_ids = input.fileIds;
      if (input.systemPromptOverride) {
        payload.system_prompt_override = input.systemPromptOverride;
      }

      const resp = await api.post("/v1/agents/chat/async", payload);
      const data = (resp.data ?? {}) as Partial<StartJobResult>;
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
        .filter((j): j is ChatJob => j !== null);
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
