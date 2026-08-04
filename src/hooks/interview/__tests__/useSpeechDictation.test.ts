/**
 * Dictation that survives a pause.
 *
 * The reported symptom was "asks questions but doesn't wait for answers —
 * captures maybe a few words". The cause: the Web Speech API ends a session on
 * its own after a second or two of silence, and `onend` set `listening=false`
 * with nothing restarting it. So the mic died the moment someone stopped to
 * think, and whatever had been captured became the whole answer.
 *
 * These drive a fake recognition engine, because the real one needs a
 * microphone and jsdom has neither it nor `SpeechRecognition`.
 */
import { act, renderHook } from "@testing-library/react"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"

type Handlers = {
  onresult: ((e: unknown) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
}

const instances: (Handlers & {
  continuous: boolean
  interimResults: boolean
  lang: string
  started: number
  stopped: number
})[] = []

class FakeRecognition {
  continuous = false
  interimResults = false
  lang = ""
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  started = 0
  stopped = 0
  constructor() {
    instances.push(this as never)
  }
  start() {
    this.started += 1
  }
  stop() {
    this.stopped += 1
  }
}

const latest = () => instances[instances.length - 1]

/** A results event shaped the way the Web Speech API delivers one. */
function resultEvent(items: { transcript: string; isFinal: boolean }[]) {
  const results = items.map((i) => {
    const r: Record<number | string, unknown> = { 0: { transcript: i.transcript }, isFinal: i.isFinal }
    return r
  })
  return { resultIndex: 0, results: Object.assign(results, { length: results.length }) }
}

beforeAll(() => {
  ;(window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition
})

beforeEach(() => {
  instances.length = 0
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe("it keeps listening through a pause", () => {
  it("restarts when the engine times out mid-answer", () => {
    const { result } = renderHook(() => useSpeechDictation({}))
    act(() => result.current.start())
    expect(instances).toHaveLength(1)

    // The engine gives up after its own silence timeout. The person has not.
    act(() => {
      latest().onend?.()
      jest.advanceTimersByTime(500)
    })

    expect(instances.length).toBeGreaterThan(1)
    expect(result.current.listening).toBe(true)
  })

  it("stays stopped once the caller stops it", () => {
    const { result } = renderHook(() => useSpeechDictation({}))
    act(() => result.current.start())
    act(() => result.current.stop())
    const count = instances.length

    act(() => {
      latest().onend?.()
      jest.advanceTimersByTime(1000)
    })

    expect(instances).toHaveLength(count)
    expect(result.current.listening).toBe(false)
  })

  it("does not restart after a permission failure", () => {
    // Restarting here would just re-prompt and fail again, noisily.
    const { result } = renderHook(() => useSpeechDictation({}))
    act(() => result.current.start())
    const count = instances.length

    act(() => {
      latest().onerror?.({ error: "not-allowed" })
      latest().onend?.()
      jest.advanceTimersByTime(1000)
    })

    expect(instances).toHaveLength(count)
    expect(result.current.listening).toBe(false)
  })

  it("does restart after a transient no-speech error", () => {
    const { result } = renderHook(() => useSpeechDictation({}))
    act(() => result.current.start())
    const count = instances.length

    act(() => {
      latest().onerror?.({ error: "no-speech" })
      latest().onend?.()
      jest.advanceTimersByTime(500)
    })

    expect(instances.length).toBeGreaterThan(count)
  })
})

describe("it reports speech as it happens", () => {
  it("asks the engine for interim results", () => {
    const { result } = renderHook(() => useSpeechDictation({}))
    act(() => result.current.start())
    // Without this the caller cannot tell "still talking" from "finished",
    // and someone speaking into a silent box cannot tell it is hearing them.
    expect(latest().interimResults).toBe(true)
    expect(latest().continuous).toBe(true)
  })

  it("passes interim text to onInterim and final text to onFinal", () => {
    const onInterim = jest.fn()
    const onFinal = jest.fn()
    const { result } = renderHook(() => useSpeechDictation({ onInterim, onFinal }))
    act(() => result.current.start())

    act(() => {
      latest().onresult?.(resultEvent([{ transcript: "I want to", isFinal: false }]))
    })
    expect(onInterim).toHaveBeenCalledWith("I want to")
    expect(onFinal).not.toHaveBeenCalled()

    act(() => {
      latest().onresult?.(resultEvent([{ transcript: "I want to run a team", isFinal: true }]))
    })
    expect(onFinal).toHaveBeenCalledWith("I want to run a team")
  })
})
