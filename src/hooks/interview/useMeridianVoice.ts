/**
 * useMeridianVoice — speak text in the real Meridian voice.
 *
 * Calls the agent-engine `POST /v1/agents/voice/synthesize` (the SAME endpoint
 * MeridianChat uses), which returns high-quality OpenAI TTS `audio/mpeg` bytes,
 * and plays them. This replaces the old useTTS path, which posted to
 * `/v1/audio/tts` — an endpoint that does not exist (404), so it silently fell
 * back to the browser's robotic SpeechSynthesis voice.
 *
 * If synthesis fails (offline, server error), it falls back to browser TTS so
 * voice mode still does *something* rather than going silent.
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { agentApi } from "@/lib/agentApi"

const MAX_CHARS = 4096 // server slices to this; keep one utterance

export function useMeridianVoice(voice = "nova") {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const [speaking, setSpeaking] = useState(false)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    cleanup()
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    setSpeaking(false)
  }, [cleanup])

  const browserFallback = useCallback((text: string) => {
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      const u = new SpeechSynthesisUtterance(text)
      u.onend = () => setSpeaking(false)
      synth.speak(u)
      setSpeaking(true)
    } catch { /* ignore */ }
  }, [])

  const speak = useCallback(async (text: string) => {
    const t = (text || "").trim()
    if (!t) return
    stop()
    setSpeaking(true)
    try {
      const res = await agentApi.post(
        "/v1/agents/voice/synthesize",
        { text: t.slice(0, MAX_CHARS), voice },
        { responseType: "arraybuffer", timeout: 30000 },
      )
      const buf: ArrayBuffer | undefined = res.data
      if (!buf || buf.byteLength === 0) throw new Error("empty audio")
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }))
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); cleanup() }
      audio.onerror = () => { setSpeaking(false); cleanup() }
      await audio.play()
    } catch {
      // Server synthesis unavailable — fall back so voice mode isn't silent.
      browserFallback(t)
    }
  }, [voice, stop, cleanup, browserFallback])

  useEffect(() => () => stop(), [stop])

  return { speak, stop, speaking }
}
