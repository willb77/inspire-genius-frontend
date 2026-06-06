import { act, renderHook, waitFor } from "@testing-library/react"

import { useMeridianSSEStream } from "../useMeridianSSEStream"
import {
  StreamingDisabledError,
  PreflightAsyncRedirectError,
  type PreflightAsyncRedirect,
} from "@/services/agent/meridianChatStream"
import * as svc from "@/services/agent/meridianChatStream"

jest.mock("@/services/agent/meridianChatStream", () => {
  const actual = jest.requireActual("@/services/agent/meridianChatStream")
  return {
    ...actual,
    streamMeridianChat: jest.fn(),
  }
})

describe("useMeridianSSEStream", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("accumulates tokens into streamingText while in flight", async () => {
    let resolveStream: () => void = () => {}
    ;(svc.streamMeridianChat as jest.Mock).mockImplementation(
      async (_req, cbs) => {
        cbs.onToken?.({ type: "token", content: "hello", agent: "Meridian" })
        cbs.onToken?.({ type: "token", content: " world", agent: "Meridian" })
        cbs.onComplete?.({
          type: "complete",
          content: "hello world",
          agent: "Meridian",
          sessionId: "s-1",
          metadata: { token_count: 2 },
        })
        await new Promise<void>((r) => {
          resolveStream = r
        })
      },
    )

    const { result } = renderHook(() => useMeridianSSEStream())

    act(() => {
      void result.current.send({ message: "hi", sessionId: "s-1" })
    })

    await waitFor(() => expect(result.current.streamingText).toBe("hello world"))
    expect(result.current.isStreaming).toBe(true)

    act(() => {
      resolveStream()
    })

    await waitFor(() => expect(result.current.isStreaming).toBe(false))
    expect(result.current.lastComplete?.content).toBe("hello world")
    expect(result.current.lastError).toBeNull()
  })

  it("invokes onFallback when the server reports STREAMING_DISABLED", async () => {
    ;(svc.streamMeridianChat as jest.Mock).mockImplementation(async () => {
      throw new StreamingDisabledError()
    })

    const onFallback = jest.fn()
    const { result } = renderHook(() => useMeridianSSEStream({ onFallback }))

    await act(async () => {
      await result.current.send({ message: "x", sessionId: "s-1" })
    })

    expect(onFallback).toHaveBeenCalledTimes(1)
    expect(result.current.lastError).toBeInstanceOf(StreamingDisabledError)
    expect(result.current.isStreaming).toBe(false)
  })

  it("captures server-emitted error frames in lastError", async () => {
    ;(svc.streamMeridianChat as jest.Mock).mockImplementation(
      async (_req, cbs) => {
        cbs.onError?.({ type: "error", message: "agent exploded" })
      },
    )

    const onError = jest.fn()
    const { result } = renderHook(() => useMeridianSSEStream({ onError }))

    await act(async () => {
      await result.current.send({ message: "x", sessionId: "s-1" })
    })

    expect(onError).toHaveBeenCalledWith({ type: "error", message: "agent exploded" })
    expect(result.current.lastError?.message).toBe("agent exploded")
  })

  it("cancel() aborts the in-flight stream without surfacing an error", async () => {
    ;(svc.streamMeridianChat as jest.Mock).mockImplementation(
      async (_req, _cbs) => {
        await new Promise(() => {
          /* never resolves; cancel() should abort it */
        })
      },
    )

    const { result } = renderHook(() => useMeridianSSEStream())

    act(() => {
      void result.current.send({ message: "x", sessionId: "s-1" })
    })

    await waitFor(() => expect(result.current.isStreaming).toBe(true))

    act(() => {
      result.current.cancel()
    })

    await waitFor(() => expect(result.current.isStreaming).toBe(false))
    expect(result.current.lastError).toBeNull()
  })

  it("populates lastAsyncRedirect + invokes onAsyncRedirect on T22 option C preflight", async () => {
    const redirect: PreflightAsyncRedirect = {
      mode: "async",
      jobId: "job-test-1",
      status: "queued",
      sessionId: "s-1",
      reason: "multi_agent_template",
    }
    ;(svc.streamMeridianChat as jest.Mock).mockImplementation(async () => {
      throw new PreflightAsyncRedirectError(redirect)
    })

    const onAsyncRedirect = jest.fn()
    const { result } = renderHook(() =>
      useMeridianSSEStream({ onAsyncRedirect }),
    )

    await act(async () => {
      await result.current.send({ message: "x", sessionId: "s-1" })
    })

    expect(onAsyncRedirect).toHaveBeenCalledWith(redirect)
    expect(result.current.lastAsyncRedirect).toEqual(redirect)
    expect(result.current.lastError).toBeNull()
    expect(result.current.isStreaming).toBe(false)
  })

  it("send() resets streamingText for each invocation", async () => {
    ;(svc.streamMeridianChat as jest.Mock).mockImplementation(
      async (_req, cbs) => {
        cbs.onToken?.({ type: "token", content: "first", agent: "Meridian" })
        cbs.onComplete?.({
          type: "complete",
          content: "first",
          agent: "Meridian",
          sessionId: "s-1",
          metadata: {},
        })
      },
    )

    const { result } = renderHook(() => useMeridianSSEStream())

    await act(async () => {
      await result.current.send({ message: "a", sessionId: "s-1" })
    })
    expect(result.current.streamingText).toBe("first")
    ;(svc.streamMeridianChat as jest.Mock).mockImplementation(
      async (_req, cbs) => {
        cbs.onToken?.({ type: "token", content: "second", agent: "Meridian" })
        cbs.onComplete?.({
          type: "complete",
          content: "second",
          agent: "Meridian",
          sessionId: "s-1",
          metadata: {},
        })
      },
    )

    await act(async () => {
      await result.current.send({ message: "b", sessionId: "s-1" })
    })
    expect(result.current.streamingText).toBe("second")
  })
})
