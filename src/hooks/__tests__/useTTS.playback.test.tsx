/**
 * Bio Capture audio "works once, then stops" (reported 2026-09-03).
 *
 * `speak()` calls `stop()` first, and `stop()` used to SUSPEND the shared
 * AudioContext. Nothing ever resumed it. The first reply played because the
 * context was created fresh; every later reply started a source on a
 * suspended context, which is silent, and since its `ended` event never fires
 * the hook stayed in the "speaking" state for good. Chronicle, the goal
 * interview and Alex voice chat all share this hook.
 *
 * These pin the contract with a fake Web Audio API: a second speak() after a
 * stop() must actually start a source, a suspended context must be resumed
 * before playback, and a superseded speak() must not clobber the state of the
 * one that replaced it.
 */
import { act, renderHook, waitFor } from "@testing-library/react"

import { useTTS } from "@/hooks/useTTS"

const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { post: (...a: unknown[]) => mockPost(...a) },
}))

jest.mock("@/hooks/useTextToSpeech", () => ({
  useTextToSpeech: () => ({
    supported: false,
    speaking: false,
    phase: "idle",
    speak: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  }),
}))

type FakeSource = {
  buffer: unknown
  onended: (() => void) | null
  connect: jest.Mock
  start: jest.Mock
  stop: jest.Mock
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  state: "running" | "suspended" = "running"
  destination = {}
  sources: FakeSource[] = []
  resume = jest.fn(async () => {
    this.state = "running"
  })
  suspend = jest.fn(async () => {
    this.state = "suspended"
  })
  close = jest.fn(async () => undefined)
  constructor() {
    FakeAudioContext.instances.push(this)
  }
  decodeAudioData(_buf: ArrayBuffer, ok: (d: unknown) => void) {
    ok({ duration: 1 })
  }
  createBufferSource(): FakeSource {
    const src: FakeSource = {
      buffer: null,
      onended: null,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(() => src.onended?.()),
    }
    this.sources.push(src)
    return src
  }
}

const audio = () => new ArrayBuffer(1024)

beforeEach(() => {
  FakeAudioContext.instances = []
  ;(globalThis as unknown as { AudioContext: unknown }).AudioContext =
    FakeAudioContext
  mockPost.mockReset()
  mockPost.mockResolvedValue({ data: audio() })
})

describe("useTTS server playback", () => {
  it("plays again after stop() — the second reply is not silent", async () => {
    const { result } = renderHook(() => useTTS())

    await act(async () => {
      void result.current.speak("first question")
    })
    const ctx = FakeAudioContext.instances[0]
    await waitFor(() => expect(ctx.sources).toHaveLength(1))
    expect(ctx.sources[0].start).toHaveBeenCalledTimes(1)

    // The member answers: the panel calls stop() on every send.
    act(() => result.current.stop())
    expect(ctx.suspend).not.toHaveBeenCalled()
    await waitFor(() => expect(result.current.speaking).toBe(false))

    await act(async () => {
      void result.current.speak("second question")
    })
    await waitFor(() => expect(ctx.sources).toHaveLength(2))
    // The whole bug: with the context suspended this start() was silent.
    expect(ctx.sources[1].start).toHaveBeenCalledTimes(1)
    expect(ctx.state).toBe("running")
  })

  it("resumes a suspended context before starting the source", async () => {
    const { result } = renderHook(() => useTTS())
    await act(async () => {
      void result.current.speak("first")
    })
    const ctx = FakeAudioContext.instances[0]
    await waitFor(() => expect(ctx.sources).toHaveLength(1))
    act(() => ctx.sources[0].onended?.())

    // pause() legitimately suspends; browsers also hand out suspended contexts.
    act(() => result.current.pause())
    expect(ctx.state).toBe("suspended")

    await act(async () => {
      void result.current.speak("after pause")
    })
    await waitFor(() => expect(ctx.sources).toHaveLength(2))
    expect(ctx.resume).toHaveBeenCalled()
    expect(ctx.state).toBe("running")
    expect(ctx.sources[1].start).toHaveBeenCalledTimes(1)
  })

  it("settles `speaking` when playback ends, and stays speaking while it plays", async () => {
    const { result } = renderHook(() => useTTS())
    await act(async () => {
      void result.current.speak("a reply")
    })
    const ctx = FakeAudioContext.instances[0]
    await waitFor(() => expect(ctx.sources).toHaveLength(1))
    expect(result.current.speaking).toBe(true)
    act(() => ctx.sources[0].onended?.())
    await waitFor(() => expect(result.current.speaking).toBe(false))
  })

  it("a superseded speak() does not reset the state of the one that replaced it", async () => {
    const { result } = renderHook(() => useTTS())
    await act(async () => {
      void result.current.speak("first")
    })
    const ctx = FakeAudioContext.instances[0]
    await waitFor(() => expect(ctx.sources).toHaveLength(1))

    // speak() calls stop() itself, which ends source[0] and settles the FIRST
    // call. That settle must be a no-op now that the second call owns the state.
    await act(async () => {
      void result.current.speak("second")
    })
    await waitFor(() => expect(ctx.sources).toHaveLength(2))
    expect(ctx.sources[0].stop).toHaveBeenCalled()
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.speaking).toBe(true)
    expect(result.current.activeProvider).toBe("server")

    act(() => ctx.sources[1].onended?.())
    await waitFor(() => expect(result.current.speaking).toBe(false))
  })
})
