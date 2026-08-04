/**
 * useSpeechDictation — browser speech-to-text for capturing a spoken answer.
 *
 * Wraps the Web Speech API (SpeechRecognition / webkitSpeechRecognition), the
 * same engine MeridianChat uses for voice input. Accumulates final transcripts
 * and reports them via onFinal. Gracefully reports `supported=false` where the
 * API is unavailable (Firefox, some mobile) so the UI can fall back to typing.
 *
 * ## It has to survive a pause, or it is not dictation
 *
 * The Web Speech API ends a session on its own after a short silence — a second
 * or two on Chrome. The first version of this hook treated that as the user
 * having finished: `onend` set `listening=false` and nothing restarted it. In a
 * chat box where you say one sentence and press send, that is survivable. In an
 * interview, where someone is asked why their job matters and stops to think
 * halfway through the answer, it is not: the mic dies mid-sentence and whatever
 * had been captured so far — "maybe a few words" — became the whole answer.
 *
 * So a session ending is now treated as what it actually is: the engine's own
 * timeout, not a decision by the person. While the caller still wants to listen,
 * recognition restarts. Listening stops when the caller says so, or when the
 * browser reports a real error (`not-allowed`, `audio-capture`) that restarting
 * would only repeat.
 *
 * `interimResults` is on so the caller can show words as they are spoken. Two
 * reasons, both about the same thing: someone talking to a silent box cannot
 * tell whether it is hearing them, and a caller that auto-sends after a pause
 * needs to know the difference between "still speaking" and "finished".
 */
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * The slice of the Web Speech API this hook uses.
 *
 * Hand-written because `SpeechRecognition` is not in TypeScript's DOM lib —
 * it is still a draft spec and ships prefixed. Typed rather than `any` so a
 * mis-read of the results structure is a compile error; the shape below is
 * exactly what Chrome and Safari deliver.
 */
type SpeechAlternative = { transcript: string }

type SpeechResult = {
  readonly length: number
  readonly isFinal: boolean
  [index: number]: SpeechAlternative
}

type SpeechResultList = {
  readonly length: number
  [index: number]: SpeechResult
}

type SpeechResultEvent = {
  resultIndex: number
  results: SpeechResultList
}

type SpeechErrorEvent = { error?: string }

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort?: () => void
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: ((e: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null
}

/**
 * Errors where restarting would just reproduce the same failure, usually
 * noisily. Everything else (`no-speech`, `network`, an aborted session) is
 * transient and worth another go.
 */
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"])

export type UseSpeechDictationOptions = {
  lang?: string
  /** Called with each newly finalized chunk of transcript. */
  onFinal?: (chunk: string) => void
  /**
   * Called with the in-progress transcript as it changes, including before it
   * is final. Use it to show the person they are being heard, and to tell
   * "still talking" apart from "stopped".
   */
  onInterim?: (text: string) => void
}

export function useSpeechDictation(opts: UseSpeechDictationOptions = {}) {
  const { lang = "en-US", onFinal, onInterim } = opts
  const [supported] = useState(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal
  const onInterimRef = useRef(onInterim)
  onInterimRef.current = onInterim

  /** What the caller wants, as opposed to what the engine is currently doing. */
  const wantListeningRef = useRef(false)
  /** Guards against a restart racing an explicit stop. */
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRestart = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    wantListeningRef.current = false
    clearRestart()
    try { recRef.current?.stop() } catch { /* ignore */ }
    setListening(false)
  }, [clearRestart])

  // `startRef` breaks the cycle between start and the onend handler that
  // restarts it — each needs the other, and neither can be declared second.
  const startRef = useRef<() => void>(() => {})

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    wantListeningRef.current = true
    clearRestart()
    try { recRef.current?.stop() } catch { /* ignore */ }

    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = lang

    rec.onresult = (e: SpeechResultEvent) => {
      let final = ""
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alt = e.results[i]?.[0]?.transcript ?? ""
        if (e.results[i]?.isFinal) final += alt + " "
        else interim += alt
      }
      // Interim first: a caller debouncing an auto-send needs to hear "still
      // going" before it hears "here is a finished phrase".
      if (interim.trim()) onInterimRef.current?.(interim.trim())
      if (final.trim()) onFinalRef.current?.(final.trim())
    }

    rec.onerror = (e: SpeechErrorEvent) => {
      const code = String(e?.error ?? "")
      if (FATAL_ERRORS.has(code)) {
        wantListeningRef.current = false
        setListening(false)
      }
      // Non-fatal errors fall through to `onend`, which restarts.
    }

    rec.onend = () => {
      if (!wantListeningRef.current) {
        setListening(false)
        return
      }
      // The engine timed out, not the person. Restart on a short delay —
      // calling start() synchronously inside onend throws InvalidStateError on
      // some browsers.
      clearRestart()
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null
        if (wantListeningRef.current) startRef.current()
      }, 250)
    }

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      // Already-started is benign; anything else means we are not listening.
      setListening(wantListeningRef.current)
    }
  }, [lang, clearRestart])

  startRef.current = start

  const toggle = useCallback(() => {
    if (wantListeningRef.current) stop()
    else start()
  }, [start, stop])

  useEffect(
    () => () => {
      wantListeningRef.current = false
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      try { recRef.current?.stop() } catch { /* ignore */ }
    },
    []
  )

  return { supported, listening, start, stop, toggle }
}
