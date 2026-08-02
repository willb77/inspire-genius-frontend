/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react"
import { useSpeechDictation } from "../useSpeechDictation"

describe("useSpeechDictation", () => {
  const w = window as unknown as Record<string, unknown>
  beforeEach(() => {
    delete w.SpeechRecognition
    delete w.webkitSpeechRecognition
  })
  afterEach(() => {
    delete w.SpeechRecognition
    delete w.webkitSpeechRecognition
  })

  it("reports unsupported when the browser has no SpeechRecognition", () => {
    const { result } = renderHook(() => useSpeechDictation())
    expect(result.current.supported).toBe(false)
    expect(result.current.listening).toBe(false)
    // start() is a safe no-op when unsupported.
    act(() => result.current.start())
    expect(result.current.listening).toBe(false)
  })

  it("dictates final transcripts to onFinal and toggles listening when supported", () => {
    const instances: any[] = []
    class FakeRec {
      continuous = false
      interimResults = false
      lang = ""
      onresult: ((e: any) => void) | null = null
      onerror: (() => void) | null = null
      onend: (() => void) | null = null
      start() { /* started */ }
      stop() { this.onend?.() }
      constructor() { instances.push(this) }
    }
    w.SpeechRecognition = FakeRec as unknown

    const chunks: string[] = []
    const { result } = renderHook(() =>
      useSpeechDictation({ onFinal: (c) => chunks.push(c) }),
    )
    expect(result.current.supported).toBe(true)

    act(() => result.current.start())
    expect(result.current.listening).toBe(true)

    // Simulate a final speech result.
    act(() => {
      instances[0].onresult({
        resultIndex: 0,
        results: [{ 0: { transcript: "my answer" }, isFinal: true, length: 1 }],
      })
    })
    expect(chunks).toEqual(["my answer"])

    act(() => result.current.stop())
    expect(result.current.listening).toBe(false)
  })
})
