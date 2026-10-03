import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  DEV_CONSOLE_QK,
  JOB_POLL_MS,
  jobRefetchInterval,
  mergeJobEvents,
  shouldPollJob,
  useAdminSessions,
  useAdmins,
  useAttachToTicket,
  useCancelJob,
  useContinueJob,
  useDevConsoleMe,
  useDevConsoleRepos,
  useGrant,
  useJob,
  useRevoke,
  useSession,
  useSessions,
  useStartJob,
} from "@/hooks/dev-console/useDevConsole";
import * as svc from "@/services/dev-console/devConsole.service";
import { isDevConsoleConfigured } from "@/lib/devConsoleApi";
import type { DevConsoleJob, JobEvent } from "@/types/devConsole";

jest.mock("@/services/dev-console/devConsole.service");
jest.mock("@/lib/devConsoleApi", () => ({ isDevConsoleConfigured: jest.fn(() => true) }));

const m = svc as jest.Mocked<typeof svc>;

function job(status: DevConsoleJob["status"], events: JobEvent[] = []): DevConsoleJob {
  return {
    job_id: "j1",
    session_id: "s1",
    repo: "repo-private",
    status,
    model: "sonnet",
    commit_sha: "a".repeat(40),
    steps: events.length,
    step_cap: 12,
    cost_usd: 0.01,
    events,
  };
}

const tool = (seq: number): JobEvent => ({ seq, ts: "t", type: "tool", tool: "Grep", summary: `s${seq}` });

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  (isDevConsoleConfigured as jest.Mock).mockReturnValue(true);
});

describe("poll rules", () => {
  it("polls only while queued or running", () => {
    expect(shouldPollJob("queued")).toBe(true);
    expect(shouldPollJob("running")).toBe(true);
    for (const s of ["awaiting_continue", "complete", "error", "cancelled"] as const) {
      expect(shouldPollJob(s)).toBe(false);
    }
    expect(shouldPollJob(undefined)).toBe(false);
  });

  it("refetch interval is 1.5 s while live, off when settled or errored", () => {
    expect(JOB_POLL_MS).toBe(1500);
    expect(jobRefetchInterval(undefined, "pending")).toBe(1500);
    expect(jobRefetchInterval(job("running"), "success")).toBe(1500);
    expect(jobRefetchInterval(job("complete"), "success")).toBe(false);
    expect(jobRefetchInterval(job("awaiting_continue"), "success")).toBe(false);
    expect(jobRefetchInterval(job("running"), "error")).toBe(false);
  });

  it("merges events by seq, in order, without duplicates", () => {
    expect(mergeJobEvents([tool(1), tool(2)], [tool(2), tool(4), tool(3)]).map((e) => e.seq)).toEqual([1, 2, 3, 4]);
    const held = [tool(1)];
    expect(mergeJobEvents(held, [])).toBe(held);
  });
});

describe("useJob", () => {
  afterEach(() => jest.useRealTimers());

  it("polls every 1.5 s with the after cursor, then stops on a terminal status", async () => {
    jest.useFakeTimers();
    m.getJob
      .mockResolvedValueOnce(job("running", [tool(1), tool(2)]))
      .mockResolvedValueOnce(job("running", [tool(3)]))
      .mockResolvedValueOnce(job("complete", [{ seq: 4, ts: "t", type: "answer", markdown: "done" }]))
      .mockResolvedValue(job("complete"));
    const { wrapper, qc } = setup();
    const invalidate = jest.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useJob("j1"), { wrapper });

    await waitFor(() => expect(m.getJob).toHaveBeenCalledTimes(1));
    expect(m.getJob).toHaveBeenNthCalledWith(1, "j1", 0);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(JOB_POLL_MS);
    });
    expect(m.getJob).toHaveBeenCalledTimes(2);
    expect(m.getJob).toHaveBeenNthCalledWith(2, "j1", 2);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(JOB_POLL_MS);
    });
    expect(m.getJob).toHaveBeenCalledTimes(3);
    expect(m.getJob).toHaveBeenNthCalledWith(3, "j1", 3);
    await waitFor(() => expect(result.current.data?.status).toBe("complete"));
    expect(result.current.data?.events.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
    // Settling refreshes the sessions list and the budget on /me.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DEV_CONSOLE_QK.sessions });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DEV_CONSOLE_QK.me });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(JOB_POLL_MS * 5);
    });
    expect(m.getJob).toHaveBeenCalledTimes(3);
  });

  it("stops polling on an error and exposes it", async () => {
    jest.useFakeTimers();
    m.getJob.mockRejectedValue(new Error("boom"));
    const { wrapper } = setup();
    const { result } = renderHook(() => useJob("j1"), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(JOB_POLL_MS * 4);
    });
    expect(m.getJob).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a job id", () => {
    const { wrapper } = setup();
    renderHook(() => useJob(null), { wrapper });
    expect(m.getJob).not.toHaveBeenCalled();
  });
});

describe("queries and mutations", () => {
  it("useDevConsoleMe probes only when configured", async () => {
    m.getDevConsoleAccess.mockResolvedValue(null);
    const { wrapper } = setup();
    const { result } = renderHook(() => useDevConsoleMe(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();

    (isDevConsoleConfigured as jest.Mock).mockReturnValue(false);
    m.getDevConsoleAccess.mockClear();
    const second = setup();
    renderHook(() => useDevConsoleMe(), { wrapper: second.wrapper });
    expect(m.getDevConsoleAccess).not.toHaveBeenCalled();
  });

  it("reads repos, sessions, a session, admins and admin sessions", async () => {
    m.listRepos.mockResolvedValue([]);
    m.listSessions.mockResolvedValue([]);
    m.getSession.mockResolvedValue({ session_id: "s1", jobs: [] });
    m.listConsoleAdmins.mockResolvedValue([]);
    m.listAdminSessions.mockResolvedValue([]);
    const { wrapper } = setup();
    const r = renderHook(
      () => ({
        repos: useDevConsoleRepos(),
        sessions: useSessions(),
        session: useSession("s1"),
        admins: useAdmins(true),
        adminSessions: useAdminSessions(true, { user: "u" }),
      }),
      { wrapper }
    );
    await waitFor(() => expect(r.result.current.adminSessions.isSuccess).toBe(true));
    expect(m.listSessions).toHaveBeenCalledWith({ limit: 20 });
    expect(m.getSession).toHaveBeenCalledWith("s1");
    expect(m.listAdminSessions).toHaveBeenCalledWith({ user: "u" });
    await waitFor(() => expect(r.result.current.repos.isSuccess && r.result.current.admins.isSuccess).toBe(true));
  });

  it("mutations call the service and invalidate what they change", async () => {
    m.startJob.mockResolvedValue({ job_id: "j1", session_id: "s1", status: "queued" });
    m.continueJob.mockResolvedValue();
    m.cancelJob.mockResolvedValue();
    m.attachSessionToTicket.mockResolvedValue();
    m.grantConsoleAdmin.mockResolvedValue();
    m.revokeConsoleAdmin.mockResolvedValue();
    const { wrapper, qc } = setup();
    qc.setQueryData(DEV_CONSOLE_QK.job("j1"), job("awaiting_continue"));
    const invalidate = jest.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(
      () => ({
        start: useStartJob(),
        cont: useContinueJob(),
        cancel: useCancelJob(),
        attach: useAttachToTicket(),
        grant: useGrant(),
        revoke: useRevoke(),
      }),
      { wrapper }
    );
    await act(async () => {
      await result.current.start.mutateAsync({
        repo: "r",
        prompt: "p",
        model: "auto",
        ref: "development",
        session_id: null,
        ticket_id: null,
      });
      await result.current.cont.mutateAsync("j1");
    });
    // Continue puts the job back into a polled state.
    expect(qc.getQueryData<DevConsoleJob>(DEV_CONSOLE_QK.job("j1"))?.status).toBe("queued");
    await act(async () => {
      await result.current.cancel.mutateAsync("j1");
      await result.current.attach.mutateAsync({ sessionId: "s1", ticketId: "t1" });
      await result.current.grant.mutateAsync("test@example.com");
      await result.current.revoke.mutateAsync("test@example.com");
    });
    expect(m.continueJob).toHaveBeenCalledWith("j1");
    expect(m.cancelJob).toHaveBeenCalledWith("j1");
    expect(m.attachSessionToTicket).toHaveBeenCalledWith("s1", "t1");
    expect(m.grantConsoleAdmin).toHaveBeenCalledWith("test@example.com");
    expect(m.revokeConsoleAdmin).toHaveBeenCalledWith("test@example.com");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DEV_CONSOLE_QK.admins });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DEV_CONSOLE_QK.job("j1") });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DEV_CONSOLE_QK.sessions });
  });
});
