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
