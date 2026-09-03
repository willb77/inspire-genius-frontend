/**
 * @jest-environment jsdom
 *
 * `useMeridianChat` — the transport every chat surface uses.
 *
 * The assertions that matter here are the ones nobody had before: that sending
 * goes over the async-jobs path and NOT the socket, and that a failure reaches
 * the caller instead of being parsed into hook state and dropped. The staging-b
 * outage on 2026-09-02 was silent for exactly that second reason.
 */
import { act, renderHook, waitFor } from "@testing-library/react"

import type { ChatJob } from "@/hooks/agents/useMeridianJob"

/* ---- Module mocks (hoisted) ---- */

const mockStartJob = jest.fn()
const mockNotifyPushFrame = jest.fn(() => false)
let jobHandlers: {
  onJobSettled?: (j: ChatJob) => void
  onJobUpdate?: (j: ChatJob) => void
} = {}

jest.mock("@/hooks/agents/useMeridianJob", () => ({
  useMeridianJob: (opts: typeof jobHandlers) => {
    jobHandlers = opts
    return { startJob: mockStartJob, notifyPushFrame: mockNotifyPushFrame }
  },
}))

const mockWsConnect = jest.fn()
const mockWsDisconnect = jest.fn()
const mockWsSendMessage = jest.fn()
let wsOnResponse: ((r: unknown) => void) | undefined

jest.mock("@/hooks/agents/useMeridianWebSocket", () => ({
  useMeridianWebSocket: (opts: { onResponse?: (r: unknown) => void }) => {
    wsOnResponse = opts.onResponse
    return {
      isConnected: true,
      connect: mockWsConnect,
      disconnect: mockWsDisconnect,
      // Deliberately exposed so a test can prove the hook never reaches for it.
      sendMessage: mockWsSendMessage,
    }
  },
}))

import { useMeridianChat } from "@/hooks/agents/useMeridianChat"

function settled(over: Partial<ChatJob> = {}): ChatJob {
  return {
    job_id: "j1",
    session_id: "s1",
    status: "complete",
    message: "q",
    content: "the answer",
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStartJob.mockResolvedValue({ job_id: "j1", status: "queued", session_id: "s1" })
  mockNotifyPushFrame.mockReturnValue(false)
})

describe("useMeridianChat", () => {
  it("sends over startJob and never over the socket", async () => {
    const { result } = renderHook(() =>
      useMeridianChat({ sessionKey: "m1", context: { surface: "team_development" } }),
    )

    await act(async () => {
      await result.current.send("can ben do sales")
    })

    expect(mockStartJob).toHaveBeenCalledTimes(1)
    expect(mockStartJob.mock.calls[0][0]).toMatchObject({
      message: "can ben do sales",
      context: expect.objectContaining({ surface: "team_development" }),
    })
    // The regression that started all of this.
    expect(mockWsSendMessage).not.toHaveBeenCalled()
  })

  it("merges the per-send context over the base context", async () => {
    const { result } = renderHook(() =>
      useMeridianChat({
        sessionKey: "m1",
        context: { surface: "team_development", active_tab: "profile" },
      }),
    )
    await act(async () => {
      await result.current.send("hello", { active_tab: "goals" })
    })
    expect(mockStartJob.mock.calls[0][0].context).toMatchObject({
      surface: "team_development",
      active_tab: "goals",
    })
  })

  it("keeps one session id across sends for the same key", async () => {
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1" }))
    await act(async () => {
      await result.current.send("one")
    })
    await act(async () => {
      await result.current.send("two")
    })
    const [a, b] = mockStartJob.mock.calls.map((c) => c[0].sessionId)
    expect(a).toBe(b)
    expect(a).toBeTruthy()
  })

  it("delivers a settled answer and clears processing", async () => {
    const onAssistant = jest.fn()
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1", onAssistant }))

    await act(async () => {
      await result.current.send("q")
    })
    expect(result.current.isProcessing).toBe(true)

    act(() => {
      jobHandlers.onJobSettled?.(settled())
    })

    await waitFor(() => expect(result.current.isProcessing).toBe(false))
    expect(onAssistant).toHaveBeenCalledWith("the answer", expect.any(Object))
    expect(result.current.error).toBeNull()
  })

  it("surfaces a failed job as an error the caller can render", async () => {
    const onError = jest.fn()
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1", onError }))
    await act(async () => {
      await result.current.send("q")
    })
    act(() => {
      jobHandlers.onJobSettled?.(settled({ status: "error", error: "engine exploded" }))
    })
    await waitFor(() => expect(result.current.error).toBe("engine exploded"))
    expect(result.current.isProcessing).toBe(false)
    expect(onError).toHaveBeenCalledWith("engine exploded")
  })

  it("treats a complete-but-empty job as a failure, not an empty answer", async () => {
    const onAssistant = jest.fn()
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1", onAssistant }))
    await act(async () => {
      await result.current.send("q")
    })
    act(() => {
      jobHandlers.onJobSettled?.(settled({ content: "   " }))
    })
    await waitFor(() => expect(result.current.error).toMatch(/empty/i))
    expect(onAssistant).not.toHaveBeenCalled()
  })

  it("surfaces a rejected startJob rather than hanging in processing", async () => {
    mockStartJob.mockRejectedValueOnce(new Error("network down"))
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1" }))
    await act(async () => {
      await result.current.send("q")
    })
    await waitFor(() => expect(result.current.error).toMatch(/couldn't reach meridian/i))
    expect(result.current.isProcessing).toBe(false)
  })

  it("renders a socket error frame the job hook did not consume", async () => {
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1" }))
    act(() => {
      wsOnResponse?.({ type: "error", message: "Failed to process message" })
    })
    await waitFor(() => expect(result.current.error).toBe("Failed to process message"))
  })

  it("routes job_* push frames to the job hook and consumes them", () => {
    mockNotifyPushFrame.mockReturnValue(true)
    renderHook(() => useMeridianChat({ sessionKey: "m1" }))
    act(() => {
      wsOnResponse?.({ type: "job_complete", job_id: "j1", session_id: "s1" })
    })
    expect(mockNotifyPushFrame).toHaveBeenCalled()
  })

  it("clearError dismisses without touching the transport", async () => {
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1" }))
    act(() => {
      wsOnResponse?.({ type: "error", message: "boom" })
    })
    await waitFor(() => expect(result.current.error).toBe("boom"))
    act(() => {
      result.current.clearError()
    })
    await waitFor(() => expect(result.current.error).toBeNull())
  })

  it("sends with no access token at all — the poll does not need a socket", async () => {
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1" }))
    await act(async () => {
      await result.current.send("q")
    })
    expect(mockWsConnect).not.toHaveBeenCalled()
    expect(mockStartJob).toHaveBeenCalledTimes(1)
  })

  it("ignores an empty send", async () => {
    const { result } = renderHook(() => useMeridianChat({ sessionKey: "m1" }))
    await act(async () => {
      await result.current.send("   ")
    })
    expect(mockStartJob).not.toHaveBeenCalled()
  })
})
