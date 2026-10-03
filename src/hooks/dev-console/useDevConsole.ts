/**
 * Claude Code console hooks (CC.3) — TanStack Query over the console service.
 *
 * Transport rule (agents.md §6): a question is sent as a job and the job is
 * POLLED. There is no socket here, and the poll is the only thing that
 * settles a turn.
 */
import { useMutation, useQuery, useQueryClient, type Query } from "@tanstack/react-query";

import {
  attachSessionToTicket,
  cancelJob,
  continueJob,
  getDevConsoleAccess,
  getJob,
  getSession,
  grantConsoleAdmin,
  listAdminSessions,
  listConsoleAdmins,
  listRepos,
  listSessions,
  revokeConsoleAdmin,
  startJob,
} from "@/services/dev-console/devConsole.service";
import { isDevConsoleConfigured } from "@/lib/devConsoleApi";
import type { DevConsoleJob, JobEvent, JobStatus, StartJobRequest } from "@/types/devConsole";

export const DEV_CONSOLE_QK = {
  me: ["devConsole", "me"] as const,
  repos: ["devConsole", "repos"] as const,
  job: (jobId: string) => ["devConsole", "job", jobId] as const,
  sessions: ["devConsole", "sessions"] as const,
  session: (sessionId: string) => ["devConsole", "session", sessionId] as const,
  admins: ["devConsole", "admins"] as const,
  adminSessions: (params?: object) => ["devConsole", "adminSessions", params] as const,
};

/** The contract's poll cadence. */
export const JOB_POLL_MS = 1500;

/**
 * Poll while the job can still produce events on its own; stop on anything
 * else. `awaiting_continue` stops too — it waits for a person, and resumes
 * only after `continue` is accepted.
 */
export function shouldPollJob(status: JobStatus | undefined): boolean {
  return status === "queued" || status === "running";
}

/** The refetchInterval rule, exported so it can be tested on its own. */
export function jobRefetchInterval(
  data: DevConsoleJob | undefined,
  queryStatus: "pending" | "error" | "success"
): number | false {
  if (queryStatus === "error") return false;
  if (!data) return JOB_POLL_MS;
  return shouldPollJob(data.status) ? JOB_POLL_MS : false;
}

/** Merge newly polled events into what is already held, by `seq`, in order. */
export function mergeJobEvents(held: JobEvent[], incoming: JobEvent[]): JobEvent[] {
  if (incoming.length === 0) return held;
  const bySeq = new Map<number, JobEvent>();
  for (const e of held) bySeq.set(e.seq, e);
  for (const e of incoming) bySeq.set(e.seq, e);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

function lastSeq(events: JobEvent[]): number {
  return events.reduce((m, e) => (e.seq > m ? e.seq : m), 0);
}

// ─── Access ───────────────────────────────────────────────────────────────

/**
 * The access probe. `data` is the `/me` body when the caller may use the
 * console, otherwise `null`. Never fires on a build without a console URL.
 */
export function useDevConsoleMe() {
  return useQuery({
    queryKey: DEV_CONSOLE_QK.me,
    queryFn: getDevConsoleAccess,
    enabled: isDevConsoleConfigured(),
    // A token that has expired at page load makes this probe 401, which hides
    // the tab (the probe deliberately skips the refresh cascade). It comes back
    // after the 60 s staleTime or on the next window-focus refetch, once the
    // ticket queue's own calls have refreshed the token.
    staleTime: 60_000,
    retry: false,
  });
}

export function useDevConsoleRepos(enabled = true) {
  return useQuery({
    queryKey: DEV_CONSOLE_QK.repos,
    queryFn: listRepos,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// ─── Jobs ─────────────────────────────────────────────────────────────────

export function useStartJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StartJobRequest) => startJob(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.sessions });
    },
  });
}

/**
 * Poll one job every 1.5 s while it is `queued` or `running`.
 *
 * Each poll asks only for events after the last `seq` held (or `after`, if
 * larger) and merges them in, so a long job is not re-downloaded every tick.
 * Polling stops on any other status and on an error; the error is the
 * query's `error`, which the panel renders.
 */
export function useJob(jobId: string | null, after = 0) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: DEV_CONSOLE_QK.job(jobId ?? ""),
    enabled: Boolean(jobId),
    retry: false,
    queryFn: async (): Promise<DevConsoleJob> => {
      const key = DEV_CONSOLE_QK.job(jobId as string);
      const held = qc.getQueryData<DevConsoleJob>(key);
      const since = Math.max(after, held ? lastSeq(held.events) : 0);
      const fresh = await getJob(jobId as string, since);
      const settled = fresh.status !== "queued" && fresh.status !== "running";
      if (settled && held?.status !== fresh.status) {
        void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.sessions });
        void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.me });
      }
      return { ...fresh, events: mergeJobEvents(held?.events ?? [], fresh.events) };
    },
    refetchInterval: (query: Query<DevConsoleJob, Error, DevConsoleJob, readonly unknown[]>) =>
      jobRefetchInterval(query.state.data, query.state.status),
  });
}

function setJobStatus(qc: ReturnType<typeof useQueryClient>, jobId: string, status: JobStatus) {
  qc.setQueryData<DevConsoleJob>(DEV_CONSOLE_QK.job(jobId), (prev) =>
    prev ? { ...prev, status } : prev
  );
}

export function useContinueJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => continueJob(jobId),
    onSuccess: (_d, jobId) => {
      // Back to polling: the job is working again.
      setJobStatus(qc, jobId, "queued");
      void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.job(jobId) });
    },
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => cancelJob(jobId),
    onSuccess: (_d, jobId) => {
      void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.job(jobId) });
    },
  });
}

// ─── Sessions ─────────────────────────────────────────────────────────────

export function useSessions(enabled = true) {
  return useQuery({
    queryKey: DEV_CONSOLE_QK.sessions,
    queryFn: () => listSessions({ limit: 20 }),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: DEV_CONSOLE_QK.session(sessionId ?? ""),
    queryFn: () => getSession(sessionId as string),
    enabled: Boolean(sessionId),
    retry: false,
  });
}

export function useAttachToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, ticketId }: { sessionId: string; ticketId: string }) =>
      attachSessionToTicket(sessionId, ticketId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.sessions });
    },
  });
}

// ─── Owner only ───────────────────────────────────────────────────────────

export function useAdmins(enabled: boolean) {
  return useQuery({
    queryKey: DEV_CONSOLE_QK.admins,
    queryFn: listConsoleAdmins,
    enabled,
    retry: false,
  });
}

export function useAdminSessions(enabled: boolean, params?: { user?: string; since?: string }) {
  return useQuery({
    queryKey: DEV_CONSOLE_QK.adminSessions(params),
    queryFn: () => listAdminSessions(params),
    enabled,
    retry: false,
  });
}

export function useGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => grantConsoleAdmin(email),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.admins });
    },
  });
}

export function useRevoke() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => revokeConsoleAdmin(email),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.admins });
    },
  });
}
