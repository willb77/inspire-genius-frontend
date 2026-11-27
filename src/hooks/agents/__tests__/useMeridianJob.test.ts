/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
  attachInterceptors: jest.fn(),
}));

// Single shared mock instance — both `useMeridianJob` (via `getApi()`)
// and the tests reach for `agentApi` so the mock has to be the same
// object both sides see.
const mockAgentApi = {
  get: jest.fn(),
  post: jest.fn(),
  defaults: { headers: { common: {} } },
};

jest.mock("@/lib/agentApi", () => ({
  agentApi: mockAgentApi,
  attachInterceptors: jest.fn(),
  useAgentEngine: () => true,
  getApi: () => mockAgentApi,
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import i18nForTest from "i18next";

import { useMeridianJob } from "../useMeridianJob";
import type { MeridianResponse } from "../useMeridianWebSocket";

beforeEach(() => {
  mockAgentApi.get.mockReset();
  mockAgentApi.post.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

// ───────────────────────────────────────────────────────────────────
// startJob → poll → complete
// ───────────────────────────────────────────────────────────────────

describe("useMeridianJob — startJob + poll", () => {
  it("POSTs /v1/agents/chat/async and seeds a queued job", async () => {
    mockAgentApi.post.mockResolvedValueOnce({
      data: { job_id: "job-1", session_id: "sess-1", status: "queued" },
    });
    mockAgentApi.get.mockResolvedValueOnce({
      data: {
        job_id: "job-1",
        session_id: "sess-1",
        status: "queued",
        message: "hello",
      },
    });

    const { result } = renderHook(() =>
      useMeridianJob({ pollIntervalMs: 5_000 }),
    );

    let started: { job_id: string } | undefined;
    await act(async () => {
      started = await result.current.startJob({
        message: "hello",
        sessionId: "sess-1",
      });
    });

    expect(mockAgentApi.post).toHaveBeenCalledWith(
      "/v1/agents/chat/async",
      expect.objectContaining({ message: "hello", session_id: "sess-1" }),
    );
    expect(started?.job_id).toBe("job-1");

    await waitFor(() => {
      expect(result.current.jobsById["job-1"]?.status).toBe("queued");
    });
  });

  it("polls until the job reaches `complete` and stops polling after", async () => {
    jest.useFakeTimers();

    mockAgentApi.post.mockResolvedValueOnce({
      data: { job_id: "job-2", session_id: "sess-2", status: "queued" },
    });

    // Three poll responses: queued → running → complete.
    mockAgentApi.get
      .mockResolvedValueOnce({
        data: {
          job_id: "job-2", session_id: "sess-2", status: "queued",
          message: "hi", content: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          job_id: "job-2", session_id: "sess-2", status: "running",
          message: "hi", content: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          job_id: "job-2", session_id: "sess-2", status: "complete",
          message: "hi", content: "the answer", agent: "Meridian",
          metadata: { contributing_agents: ["Meridian"] },
          completed_at: "2026-05-19T01:00:00Z",
        },
      });

    const settled: { content: string }[] = [];
    const { result } = renderHook(() =>
      useMeridianJob({
        pollIntervalMs: 50,
        onJobSettled: (j) => settled.push({ content: j.content ?? "" }),
      }),
    );

    await act(async () => {
      await result.current.startJob({ message: "hi", sessionId: "sess-2" });
    });

    // First poll fires immediately on startPolling().
    await waitFor(() => {
      expect(result.current.jobsById["job-2"]?.status).toBe("queued");
    });

    // Advance to the second poll (running).
    await act(async () => {
      jest.advanceTimersByTime(60);
    });
    await waitFor(() => {
      expect(result.current.jobsById["job-2"]?.status).toBe("running");
    });

    // Third poll → complete.
    await act(async () => {
      jest.advanceTimersByTime(60);
    });
    await waitFor(() => {
      expect(result.current.jobsById["job-2"]?.status).toBe("complete");
    });

    expect(result.current.jobsById["job-2"]?.content).toBe("the answer");
    expect(settled).toEqual([{ content: "the answer" }]);

    const callsBefore = mockAgentApi.get.mock.calls.length;
    // After complete, the poll loop should have been cancelled. Advance
    // far in time — no more GET requests should fire.
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(mockAgentApi.get.mock.calls.length).toBe(callsBefore);
  });
});

// ───────────────────────────────────────────────────────────────────
// WS push completes the job without further polling
// ───────────────────────────────────────────────────────────────────

describe("useMeridianJob — push frame short-circuits polling", () => {
  it("settles a job from a WS job_complete frame and cancels the poll", async () => {
    jest.useFakeTimers();

    mockAgentApi.post.mockResolvedValueOnce({
      data: { job_id: "job-3", session_id: "sess-3", status: "queued" },
    });
    // First (and only) poll while queued. After the push frame lands we
    // shouldn't see another GET.
    mockAgentApi.get.mockResolvedValueOnce({
      data: {
        job_id: "job-3", session_id: "sess-3", status: "queued",
        message: "go", content: null,
      },
    });

    const settled: string[] = [];
    const { result } = renderHook(() =>
      useMeridianJob({
        pollIntervalMs: 1_000,
        onJobSettled: (j) => settled.push(j.content ?? ""),
      }),
    );

    await act(async () => {
      await result.current.startJob({ message: "go", sessionId: "sess-3" });
    });
    await waitFor(() => {
      expect(result.current.jobsById["job-3"]?.status).toBe("queued");
    });

    // Drop a job_complete WS frame in. The hook should mark the job
    // complete, fire onJobSettled, and cancel the poll.
    const pushFrame: MeridianResponse = {
      type: "job_complete",
      job_id: "job-3",
      session_id: "sess-3",
      content: "pushed answer",
      agent: "Meridian",
      metadata: { contributing_agents: ["Meridian"] },
    };

    let consumed: boolean = false;
    act(() => {
      consumed = result.current.notifyPushFrame(pushFrame);
    });
    expect(consumed).toBe(true);

    await waitFor(() => {
      expect(result.current.jobsById["job-3"]?.status).toBe("complete");
    });
    expect(result.current.jobsById["job-3"]?.content).toBe("pushed answer");
    expect(settled).toEqual(["pushed answer"]);

    const callsBefore = mockAgentApi.get.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    // No more GETs — push frame cancelled the poll.
    expect(mockAgentApi.get.mock.calls.length).toBe(callsBefore);
  });

  it("returns false (and is a no-op) on non-job frames", () => {
    const { result } = renderHook(() => useMeridianJob());
    let consumed: boolean = true;
    act(() => {
      consumed = result.current.notifyPushFrame({
        type: "token",
        content: "x",
      } as MeridianResponse);
    });
    expect(consumed).toBe(false);
    expect(Object.keys(result.current.jobsById)).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────
// Page-refresh hydration via listActiveJobs
// ───────────────────────────────────────────────────────────────────

describe("useMeridianJob — listActiveJobs", () => {
  it("seeds in-flight jobs and resumes polling for non-terminal ones", async () => {
    mockAgentApi.get
      // listActiveJobs response — one running, one already complete
      .mockResolvedValueOnce({
        data: [
          {
            job_id: "j-running",
            session_id: "sess-4",
            status: "running",
            message: "first",
          },
          {
            job_id: "j-done",
            session_id: "sess-4",
            status: "complete",
            message: "second",
            content: "already done",
          },
        ],
      })
      // Resumed poll for j-running picks up the final state
      .mockResolvedValueOnce({
        data: {
          job_id: "j-running",
          session_id: "sess-4",
          status: "complete",
          message: "first",
          content: "now done",
        },
      });

    const settled: string[] = [];
    const { result } = renderHook(() =>
      useMeridianJob({
        pollIntervalMs: 200,
        onJobSettled: (j) => settled.push(j.job_id),
      }),
    );

    await act(async () => {
      const listed = await result.current.listActiveJobs("sess-4");
      expect(listed).toHaveLength(2);
    });

    // Both rows hydrated into state regardless of subsequent transitions.
    expect(result.current.jobsById["j-done"]?.status).toBe("complete");
    expect(result.current.jobsById["j-done"]?.content).toBe("already done");

    // The resumed poll fires immediately for j-running and lands on
    // complete via the second mocked GET. Use waitFor so we don't race
    // the microtask boundary.
    await waitFor(() => {
      expect(result.current.jobsById["j-running"]?.status).toBe("complete");
    });
    expect(result.current.jobsById["j-running"]?.content).toBe("now done");
    expect(settled).toContain("j-done");
    expect(settled).toContain("j-running");
  });
});

// ───────────────────────────────────────────────────────────────────
// Dedupe — concurrent WS push + REST poll settlement
// ───────────────────────────────────────────────────────────────────

describe("useMeridianJob — settlement dedupe", () => {
  it("fires onJobSettled exactly once when a WS push and an in-flight REST poll both settle the same job_id", async () => {
    // No fake timers — the race we're modelling is two terminal
    // settlements landing on the hook back-to-back. The WS push wins
    // first; the in-flight GET resolves a few ms later with the same
    // terminal state. Without a dedupe guard, both fire onJobSettled.
    mockAgentApi.post.mockResolvedValueOnce({
      data: { job_id: "job-dup", session_id: "sess-dup", status: "queued" },
    });

    mockAgentApi.get
      .mockResolvedValueOnce({
        data: {
          job_id: "job-dup", session_id: "sess-dup", status: "queued",
          message: "race me", content: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          job_id: "job-dup", session_id: "sess-dup", status: "complete",
          message: "race me", content: "synthesized answer", agent: "Meridian",
          metadata: { contributing_agents: ["Meridian"] },
          completed_at: "2026-05-20T03:00:00Z",
        },
      });

    const settled: string[] = [];
    const { result } = renderHook(() =>
      useMeridianJob({
        pollIntervalMs: 2_000,
        onJobSettled: (j) => settled.push(j.content ?? ""),
      }),
    );

    await act(async () => {
      await result.current.startJob({ message: "race me", sessionId: "sess-dup" });
    });
    await waitFor(() => {
      expect(result.current.jobsById["job-dup"]?.status).toBe("queued");
    });

    // 1. WS push lands first and settles the job to complete.
    const pushFrame: MeridianResponse = {
      type: "job_complete",
      job_id: "job-dup",
      session_id: "sess-dup",
      content: "synthesized answer",
      agent: "Meridian",
      metadata: { contributing_agents: ["Meridian"] },
    };
    act(() => {
      result.current.notifyPushFrame(pushFrame);
    });
    await waitFor(() => {
      expect(result.current.jobsById["job-dup"]?.status).toBe("complete");
    });

    // 2. The in-flight REST GET (already in flight before the push
    //    frame cancelled the timer) resolves now with the same terminal
    //    state. Same code path the in-flight tick takes when its
    //    `await api.get(...)` finally settles.
    await act(async () => {
      await result.current.pollJob("job-dup");
    });

    // The bubble must be rendered exactly once. Two settlements for the
    // same job_id ⇒ one onJobSettled call.
    expect(settled).toEqual(["synthesized answer"]);
  });

  it("does not re-fire onJobSettled when listActiveJobs re-hydrates an already-terminal job after a WS push", async () => {
    // Page refresh scenario: WS push already settled the job, then the
    // user reloads and listActiveJobs replays the same terminal row.
    // The hook must NOT re-fire onJobSettled — otherwise refreshes
    // would re-render assistant bubbles.
    mockAgentApi.post.mockResolvedValueOnce({
      data: { job_id: "job-refresh", session_id: "sess-refresh", status: "queued" },
    });
    mockAgentApi.get
      .mockResolvedValueOnce({
        data: {
          job_id: "job-refresh", session_id: "sess-refresh", status: "queued",
          message: "hi", content: null,
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            job_id: "job-refresh", session_id: "sess-refresh", status: "complete",
            message: "hi", content: "the answer",
          },
        ],
      });

    const settled: string[] = [];
    const { result } = renderHook(() =>
      useMeridianJob({
        pollIntervalMs: 5_000,
        onJobSettled: (j) => settled.push(j.job_id),
      }),
    );

    await act(async () => {
      await result.current.startJob({ message: "hi", sessionId: "sess-refresh" });
    });
    await waitFor(() => {
      expect(result.current.jobsById["job-refresh"]?.status).toBe("queued");
    });

    // WS push settles it first.
    act(() => {
      result.current.notifyPushFrame({
        type: "job_complete",
        job_id: "job-refresh",
        session_id: "sess-refresh",
        content: "the answer",
        agent: "Meridian",
      });
    });
    await waitFor(() => {
      expect(result.current.jobsById["job-refresh"]?.status).toBe("complete");
    });
    expect(settled).toEqual(["job-refresh"]);

    // Simulated page-refresh hydration returns the same terminal row.
    await act(async () => {
      await result.current.listActiveJobs("sess-refresh");
    });

    // Still one settlement — no replay.
    expect(settled).toEqual(["job-refresh"]);
  });
});

// ───────────────────────────────────────────────────────────────────
// Ownership / 404 path
// ───────────────────────────────────────────────────────────────────

describe("useMeridianJob — pollJob 404 handling", () => {
  it("returns null on 404 without rethrowing", async () => {
    mockAgentApi.get.mockRejectedValueOnce({
      response: { status: 404 },
    });

    const { result } = renderHook(() => useMeridianJob());
    let returned: unknown = "unset";
    await act(async () => {
      returned = await result.current.pollJob("nonexistent");
    });
    expect(returned).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────
// startJob retry-with-backoff (cold-start mitigation)
// ───────────────────────────────────────────────────────────────────

describe("useMeridianJob — startJob retry-with-backoff", () => {
  it("retries on 503 and succeeds on second attempt", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });

    mockAgentApi.post
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({
        data: { job_id: "retry-1", session_id: "sess-r1", status: "queued" },
      });
    mockAgentApi.get.mockResolvedValue({
      data: {
        job_id: "retry-1", session_id: "sess-r1", status: "queued",
        message: "hi", content: null,
      },
    });

    const { result } = renderHook(() => useMeridianJob({ pollIntervalMs: 50_000 }));

    let started: { job_id: string } | undefined;
    await act(async () => {
      const promise = result.current.startJob({ message: "hi", sessionId: "sess-r1" });
      // Drain the 3s backoff so the retry can fire.
      await jest.advanceTimersByTimeAsync(3_500);
      started = await promise;
    });

    expect(started?.job_id).toBe("retry-1");
    expect(mockAgentApi.post).toHaveBeenCalledTimes(2);
  });

  it("retries on network error (no response) and succeeds on second attempt", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });

    mockAgentApi.post
      .mockRejectedValueOnce({ code: "ERR_NETWORK", message: "network error" })
      .mockResolvedValueOnce({
        data: { job_id: "retry-2", session_id: "sess-r2", status: "queued" },
      });
    mockAgentApi.get.mockResolvedValue({
      data: {
        job_id: "retry-2", session_id: "sess-r2", status: "queued",
        message: "hi", content: null,
      },
    });

    const { result } = renderHook(() => useMeridianJob({ pollIntervalMs: 50_000 }));

    let started: { job_id: string } | undefined;
    await act(async () => {
      const promise = result.current.startJob({ message: "hi", sessionId: "sess-r2" });
      await jest.advanceTimersByTimeAsync(3_500);
      started = await promise;
    });

    expect(started?.job_id).toBe("retry-2");
    expect(mockAgentApi.post).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 4xx (deterministic client-side error)", async () => {
    mockAgentApi.post.mockRejectedValueOnce({
      response: { status: 422, data: { detail: "validation error" } },
    });

    const { result } = renderHook(() => useMeridianJob());

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.startJob({ message: "hi", sessionId: "sess-bad" });
      } catch (err) {
        caught = err;
      }
    });

    expect(caught).toBeTruthy();
    expect(mockAgentApi.post).toHaveBeenCalledTimes(1);
  });

  it("throws after 3 failed attempts (exhausted backoff)", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });

    mockAgentApi.post
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockRejectedValueOnce({ response: { status: 503 } });

    const { result } = renderHook(() => useMeridianJob());

    let caught: unknown = null;
    await act(async () => {
      const promise = result.current.startJob({ message: "hi", sessionId: "sess-cold" });
      // Drain both backoffs (3s + 6s).
      await jest.advanceTimersByTimeAsync(10_000);
      try {
        await promise;
      } catch (err) {
        caught = err;
      }
    });

    expect(mockAgentApi.post).toHaveBeenCalledTimes(3);
    expect(caught).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────
// A9 / I18N-6c — context.ui_language
// ───────────────────────────────────────────────────────────────────

describe("useMeridianJob — context.ui_language (A9 / I18N-6c)", () => {
  const i18nSingleton = i18nForTest as { resolvedLanguage?: string };
  const original = i18nSingleton.resolvedLanguage;

  afterEach(() => {
    Object.defineProperty(i18nSingleton, "resolvedLanguage", {
      value: original, configurable: true, writable: true,
    });
  });

  async function postedContext(
    lang: string | undefined,
    context?: Record<string, unknown>,
  ): Promise<unknown> {
    Object.defineProperty(i18nSingleton, "resolvedLanguage", {
      value: lang, configurable: true, writable: true,
    });
    mockAgentApi.post.mockResolvedValueOnce({
      data: { job_id: "job-l", session_id: "s", status: "queued" },
    });
    mockAgentApi.get.mockResolvedValue({
      data: { job_id: "job-l", session_id: "s", status: "queued", message: "hi" },
    });
    const { result } = renderHook(() => useMeridianJob({ pollIntervalMs: 60_000 }));
    await act(async () => {
      await result.current.startJob({ message: "hi", sessionId: "s", context });
    });
    return (mockAgentApi.post.mock.calls[0][1] as { context?: unknown }).context;
  }

  it("sends the resolved UI language on top of the caller's context", async () => {
    expect(await postedContext("es", { surface: "chat" })).toEqual({
      ui_language: "es", surface: "chat",
    });
  });

  it("sends it even when the caller passed no context", async () => {
    expect(await postedContext("pt")).toEqual({ ui_language: "pt" });
  });

  it("an explicit caller value wins", async () => {
    expect(await postedContext("es", { ui_language: "fr" })).toEqual({ ui_language: "fr" });
  });

  it("adds nothing (payload unchanged) when i18n has no resolved language", async () => {
    expect(await postedContext(undefined, { surface: "chat" })).toEqual({ surface: "chat" });
    mockAgentApi.post.mockReset();
    expect(await postedContext(undefined)).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────
// D-17 PR-C: a job that never settles is settled as an error
// ───────────────────────────────────────────────────────────────────

describe("useMeridianJob — client-side settle (D-17 PR-C)", () => {
  const TIMED_OUT = "Meridian took too long to answer. Please try again.";
  const LOST = "Lost contact with Meridian while it was answering. Please try again.";

  const running = (id = "job-d") => ({
    data: { job_id: id, session_id: "s-d", status: "running", message: "hi", content: null },
  });
  const networkError = () => Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });
  const notFound = () => Object.assign(new Error("404"), { response: { status: 404 } });

  async function start(
    opts: Parameters<typeof useMeridianJob>[0],
    id = "job-d",
  ) {
    mockAgentApi.post.mockResolvedValueOnce({
      data: { job_id: id, session_id: "s-d", status: "queued" },
    });
    const hook = renderHook(() => useMeridianJob(opts));
    await act(async () => {
      await hook.result.current.startJob({ message: "hi", sessionId: "s-d" });
    });
    return hook;
  }

  /** Advance fake time and flush the poll promises each interval queues. */
  async function advance(ms: number) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ms);
    });
  }

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
  });

  it("settles a job that is still running at the deadline as a readable error, once", async () => {
    mockAgentApi.get.mockResolvedValue(running());
    const onJobSettled = jest.fn();
    const { result } = await start({ pollIntervalMs: 1_000, pollTimeoutMs: 3_000, onJobSettled });

    await advance(3_000);
    expect(result.current.jobsById["job-d"]?.status).toBe("running");
    expect(onJobSettled).not.toHaveBeenCalled();

    await advance(1_000); // first tick past the deadline
    const job = result.current.jobsById["job-d"];
    expect(job?.status).toBe("error");
    expect(job?.client_settled).toBe("deadline");
    expect(job?.error).toBe(TIMED_OUT);
    expect(job?.message).toBe("hi");
    expect(onJobSettled).toHaveBeenCalledTimes(1);
    expect(onJobSettled.mock.calls[0][0]).toMatchObject({ status: "error", error: TIMED_OUT });

    // Polling stopped with the settle.
    const calls = mockAgentApi.get.mock.calls.length;
    await advance(10_000);
    expect(mockAgentApi.get.mock.calls.length).toBe(calls);
    expect(onJobSettled).toHaveBeenCalledTimes(1);
  });

  it("settles after N consecutive failed polls (network errors)", async () => {
    mockAgentApi.get.mockRejectedValue(networkError());
    const onJobSettled = jest.fn();
    const { result } = await start({
      pollIntervalMs: 1_000, pollTimeoutMs: 600_000, maxPollFailures: 5, onJobSettled,
    });

    // Immediate tick + 3 intervals = 4 failures: still in flight.
    await advance(3_000);
    expect(mockAgentApi.get).toHaveBeenCalledTimes(4);
    expect(result.current.jobsById["job-d"]?.status).toBe("queued");
    expect(onJobSettled).not.toHaveBeenCalled();

    await advance(1_000); // 5th failure
    const job = result.current.jobsById["job-d"];
    expect(job?.status).toBe("error");
    expect(job?.client_settled).toBe("poll_failures");
    expect(job?.error).toBe(LOST);
    expect(onJobSettled).toHaveBeenCalledTimes(1);

    await advance(10_000);
    expect(mockAgentApi.get).toHaveBeenCalledTimes(5);
  });

  it("defaults N to 5", async () => {
    mockAgentApi.get.mockRejectedValue(networkError());
    const { result } = await start({ pollIntervalMs: 1_000 });
    await advance(3_000);
    expect(result.current.jobsById["job-d"]?.status).toBe("queued");
    await advance(1_000);
    expect(result.current.jobsById["job-d"]?.client_settled).toBe("poll_failures");
  });

  it("a successful read resets the failure count (N-1 failures, a success, N-1 more: no settle)", async () => {
    mockAgentApi.get
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(running())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockRejectedValue(networkError());
    const onJobSettled = jest.fn();
    const { result } = await start({ pollIntervalMs: 1_000, pollTimeoutMs: 600_000, onJobSettled });

    await advance(8_000); // 9 polls: 4 fail, 1 ok, 4 fail
    expect(mockAgentApi.get).toHaveBeenCalledTimes(9);
    expect(result.current.jobsById["job-d"]?.status).toBe("running");
    expect(onJobSettled).not.toHaveBeenCalled();

    await advance(1_000); // 5th consecutive failure since the success
    expect(result.current.jobsById["job-d"]?.client_settled).toBe("poll_failures");
    expect(onJobSettled).toHaveBeenCalledTimes(1);
  });

  it("a 404 streak settles the same way (a 404 is not transient)", async () => {
    mockAgentApi.get.mockRejectedValue(notFound());
    const { result } = await start({ pollIntervalMs: 1_000, pollTimeoutMs: 600_000 });
    await advance(4_000);
    expect(result.current.jobsById["job-d"]?.status).toBe("error");
    expect(result.current.jobsById["job-d"]?.client_settled).toBe("poll_failures");
  });

  it("settle-once: a late job_complete push after a client settle is dropped", async () => {
    mockAgentApi.get.mockResolvedValue(running());
    const onJobSettled = jest.fn();
    const onJobUpdate = jest.fn();
    const { result } = await start({
      pollIntervalMs: 1_000, pollTimeoutMs: 2_000, onJobSettled, onJobUpdate,
    });
    await advance(3_000);
    expect(result.current.jobsById["job-d"]?.client_settled).toBe("deadline");
    const updatesAtSettle = onJobUpdate.mock.calls.length;

    let consumed = false;
    act(() => {
      consumed = result.current.notifyPushFrame({
        type: "job_complete",
        job_id: "job-d",
        session_id: "s-d",
        content: "the late answer",
      } as MeridianResponse);
    });
    expect(consumed).toBe(true);
    const job = result.current.jobsById["job-d"];
    expect(job?.status).toBe("error");
    expect(job?.content).toBeNull();
    expect(onJobSettled).toHaveBeenCalledTimes(1);
    expect(onJobUpdate).toHaveBeenCalledTimes(updatesAtSettle);
  });

  it("settle-once: a poll answer landing after the deadline settle is dropped", async () => {
    // The tick that crosses the deadline settles; a request that was already
    // in flight then resolves with the real answer. It must not replace the error.
    let resolveLate: (v: unknown) => void = () => undefined;
    mockAgentApi.get
      .mockResolvedValueOnce(running())
      .mockImplementationOnce(() => new Promise((r) => { resolveLate = r; }))
      .mockResolvedValue(running());
    const onJobSettled = jest.fn();
    const { result } = await start({ pollIntervalMs: 1_000, pollTimeoutMs: 1_500, onJobSettled });
    await advance(1_000); // 2nd poll now hanging
    await advance(1_000); // past the deadline → settle
    expect(result.current.jobsById["job-d"]?.client_settled).toBe("deadline");

    await act(async () => {
      resolveLate({
        data: {
          job_id: "job-d", session_id: "s-d", status: "complete", message: "hi",
          content: "the late answer",
        },
      });
      await Promise.resolve();
    });
    expect(result.current.jobsById["job-d"]?.status).toBe("error");
    expect(result.current.jobsById["job-d"]?.content).toBeNull();
    expect(onJobSettled).toHaveBeenCalledTimes(1);
  });

  it("settle-once: listActiveJobs does not re-hydrate (or re-poll) a job this client already settled", async () => {
    mockAgentApi.get.mockResolvedValue(running());
    const { result } = await start({ pollIntervalMs: 1_000, pollTimeoutMs: 1_500 });
    await advance(2_000);
    expect(result.current.jobsById["job-d"]?.client_settled).toBe("deadline");

    mockAgentApi.get.mockReset();
    mockAgentApi.get.mockResolvedValueOnce({
      data: [{ job_id: "job-d", session_id: "s-d", status: "running", message: "hi" }],
    });
    let active: unknown[] = [];
    await act(async () => {
      active = await result.current.listActiveJobs("s-d");
    });
    expect(active).toEqual([]);
    expect(result.current.jobsById["job-d"]?.status).toBe("error");
    await advance(5_000);
    expect(mockAgentApi.get).toHaveBeenCalledTimes(1); // the list call only, no re-poll
  });

  it("a re-hydrated orphan (listActiveJobs) settles at the deadline instead of spinning", async () => {
    mockAgentApi.get.mockResolvedValueOnce({
      data: [{ job_id: "job-o", session_id: "s-d", status: "running", message: "old q" }],
    });
    mockAgentApi.get.mockResolvedValue(running("job-o"));
    const onJobSettled = jest.fn();
    const { result } = renderHook(() =>
      useMeridianJob({ pollIntervalMs: 1_000, pollTimeoutMs: 3_000, onJobSettled }),
    );
    await act(async () => {
      await result.current.listActiveJobs("s-d");
    });
    await advance(4_000);
    expect(result.current.jobsById["job-o"]).toMatchObject({
      status: "error", client_settled: "deadline", session_id: "s-d",
    });
    expect(onJobSettled).toHaveBeenCalledTimes(1);
  });

  it("does not settle a job whose server verdict arrived first", async () => {
    mockAgentApi.get.mockResolvedValue({
      data: { job_id: "job-d", session_id: "s-d", status: "complete", message: "hi", content: "ok" },
    });
    const onJobSettled = jest.fn();
    const { result } = await start({ pollIntervalMs: 1_000, pollTimeoutMs: 1_500, onJobSettled });
    await advance(5_000);
    expect(result.current.jobsById["job-d"]).toMatchObject({ status: "complete", content: "ok" });
    expect(result.current.jobsById["job-d"]?.client_settled).toBeUndefined();
    expect(onJobSettled).toHaveBeenCalledTimes(1);
  });

  it("does not settle a job the consumer removed while it was polling", async () => {
    mockAgentApi.get.mockRejectedValue(networkError());
    const onJobSettled = jest.fn();
    const { result } = await start({ pollIntervalMs: 1_000, onJobSettled });
    act(() => {
      result.current.removeJob("job-d");
    });
    await advance(10_000);
    expect(result.current.jobsById["job-d"]).toBeUndefined();
    expect(onJobSettled).not.toHaveBeenCalled();
  });

  it("resolves the error text through i18n (chat namespace) when a translation exists", async () => {
    const spy = jest
      .spyOn(i18nForTest, "t")
      .mockImplementation(((key: string) =>
        key === "meridian.jobTimedOut" ? "Meridian odpovídal příliš dlouho." : key) as never);
    try {
      mockAgentApi.get.mockResolvedValue(running());
      const { result } = await start({ pollIntervalMs: 1_000, pollTimeoutMs: 1_500 });
      await advance(2_000);
      expect(result.current.jobsById["job-d"]?.error).toBe("Meridian odpovídal příliš dlouho.");
      expect(spy).toHaveBeenCalledWith(
        "meridian.jobTimedOut",
        expect.objectContaining({ ns: "chat", defaultValue: TIMED_OUT }),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("falls back to the English sentence, never the raw key, when i18n returns the key", async () => {
    const spy = jest
      .spyOn(i18nForTest, "t")
      .mockImplementation(((key: string) => key) as never);
    try {
      mockAgentApi.get.mockRejectedValue(networkError());
      const { result } = await start({ pollIntervalMs: 1_000 });
      await advance(4_000);
      expect(result.current.jobsById["job-d"]?.error).toBe(LOST);
    } finally {
      spy.mockRestore();
    }
  });
});
