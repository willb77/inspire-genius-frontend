/**
 * useMeridianVoice — speak text in the real Meridian voice, with full transport.
 *
 * Fetches high-quality OpenAI TTS from the agent-engine
 * `POST /v1/agents/voice/synthesize` (the same endpoint MeridianChat uses;
 * returns `audio/mpeg`) and plays it through an HTMLAudioElement, exposing full
 * playback controls: play, pause, stop/cancel, and seek (fast-forward / rewind).
 *
 * If synthesis fails (offline / server error) it falls back to the browser's
 * SpeechSynthesis so voice mode isn't silent — the transport controls apply to
 * the server-audio path (the browser path is fire-and-forget stop only).
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { agentApi } from "@/lib/agentApi"

const MAX_CHARS = 4096

export type VoiceState = {
  /** Audio is loaded and available for transport controls. */
  ready: boolean
  /** Currently playing. */
  playing: boolean
  /** Loaded but paused. */
  paused: boolean
  /** Fetching audio from the server. */
  loading: boolean
  currentTime: number
  duration: number
}

export function useMeridianVoice(voice = "nova") {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const [state, setState] = useState<VoiceState>({
    ready: false, playing: false, paused: false, loading: false, currentTime: 0, duration: 0,
  })

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
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
    setState({ ready: false, playing: false, paused: false, loading: false, currentTime: 0, duration: 0 })
  }, [cleanup])

  const play = useCallback(() => { void audioRef.current?.play() }, [])
  const pause = useCallback(() => { audioRef.current?.pause() }, [])
  const toggle = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) void a.play(); else a.pause()
  }, [])
  /** Seek by delta seconds (negative = rewind). */
  const seek = useCallback((delta: number) => {
    const a = audioRef.current
    if (!a || !isFinite(a.duration)) return
    a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + delta))
  }, [])

  const browserFallback = useCallback((text: string) => {
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      const u = new SpeechSynthesisUtterance(text)
      u.onend = () => setState((s) => ({ ...s, playing: false, ready: false }))
      synth.speak(u)
      setState((s) => ({ ...s, playing: true, ready: false }))
    } catch { /* ignore */ }
  }, [])

  const speak = useCallback(async (text: string) => {
    const t = (text || "").trim()
    if (!t) return
    stop()
    setState((s) => ({ ...s, loading: true }))
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
      audio.onloadedmetadata = () => setState((s) => ({ ...s, duration: isFinite(audio.duration) ? audio.duration : 0 }))
      audio.ontimeupdate = () => setState((s) => ({ ...s, currentTime: audio.currentTime }))
      audio.onplay = () => setState((s) => ({ ...s, playing: true, paused: false, ready: true, loading: false }))
      audio.onpause = () => setState((s) => ({ ...s, playing: false, paused: !audio.ended }))
      audio.onended = () => setState((s) => ({ ...s, playing: false, paused: false }))
      audio.onerror = () => stop()
      await audio.play()
    } catch {
      setState((s) => ({ ...s, loading: false }))
      browserFallback(t)
    }
  }, [voice, stop, browserFallback])

  useEffect(() => () => stop(), [stop])

  return { speak, play, pause, toggle, stop, seek, ...state }
}
