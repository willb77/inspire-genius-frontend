/**
 * useSpeechDictation — browser speech-to-text for capturing a spoken answer.
 *
 * Wraps the Web Speech API (SpeechRecognition / webkitSpeechRecognition), the
 * same engine MeridianChat uses for voice input. Accumulates final transcripts
 * and reports them via onFinal. Gracefully reports `supported=false` where the
 * API is unavailable (Firefox, some mobile) so the UI can fall back to typing.
 */
import { useCallback, useEffect, useRef, useState } from "react"

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null
}

export type UseSpeechDictationOptions = {
  lang?: string
  /** Called with each newly finalized chunk of transcript. */
  onFinal?: (chunk: string) => void
}

export function useSpeechDictation(opts: UseSpeechDictationOptions = {}) {
  const { lang = "en-US", onFinal } = opts
  const [supported] = useState(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  const stop = useCallback(() => {
    try { recRef.current?.stop() } catch { /* ignore */ }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    try { recRef.current?.stop() } catch { /* ignore */ }
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = lang
    rec.onresult = (e: any) => {
      let chunk = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) chunk += e.results[i][0].transcript + " "
      }
      if (chunk.trim()) onFinalRef.current?.(chunk.trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch { setListening(false) }
  }, [lang])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  useEffect(() => () => { try { recRef.current?.stop() } catch { /* ignore */ } }, [])

  return { supported, listening, start, stop, toggle }
}
