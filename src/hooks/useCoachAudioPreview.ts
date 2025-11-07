import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import DemoAudioService from "@/services/demoAudioService"
import { fetchCoachAudioPcm, type CoachAudioParams } from "@/services/coachAudioPreviewService"

export type CoachAudioPhase = "idle" | "starting" | "speaking" | "paused" | "error"

function keyFromParams(p?: CoachAudioParams): (string | undefined)[] {
  return ["coach-audio-preview", p?.accentId, p?.genderId, (p?.toneIds ?? []).slice().sort().join(",")] as const
}

export function useCoachAudioPreview() {
  const demoAudioServiceRef = useRef<DemoAudioService | null>(null)
  if (!demoAudioServiceRef.current) demoAudioServiceRef.current = new DemoAudioService()
  const fetchAbortRef = useRef<AbortController | null>(null)
  const lastParamsRef = useRef<CoachAudioParams | null>(null)
  const [phase, setPhase] = useState<CoachAudioPhase>("idle")
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const stop = useCallback(() => {
    fetchAbortRef.current?.abort()
    fetchAbortRef.current = null
    demoAudioServiceRef.current?.stopAudio()
    setPhase("idle")
    setError(null)
  }, [])

  const play = useCallback(async (params?: CoachAudioParams) => {
    try {
      stop()
      setPhase("starting")
      setError(null)
      const svc = demoAudioServiceRef.current!
      await svc.initializeAudioContext()
      svc.resetAudioState()
      const controller = new AbortController()
      fetchAbortRef.current = controller
      const buffer = await queryClient.fetchQuery({
        queryKey: keyFromParams(params),
        queryFn: () => fetchCoachAudioPcm(params, controller),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      })
      svc.addAudioChunk(buffer)
      svc.forceStart()
      setPhase("speaking")
      lastParamsRef.current = params ?? null
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      const msg = e instanceof Error ? e.message : "Failed to play audio"
      setError(msg)
      setPhase("error")
    }
  }, [stop, queryClient])

  const playFresh = useCallback(async (params?: CoachAudioParams) => {
    try {
      stop()
      setPhase("starting")
      setError(null)
      const svc = demoAudioServiceRef.current!
      await svc.initializeAudioContext()
      svc.resetAudioState()
      const controller = new AbortController()
      fetchAbortRef.current = controller
      // Bypass cache: call service directly
      const buffer = await fetchCoachAudioPcm(params, controller)
      svc.addAudioChunk(buffer)
      svc.forceStart()
      setPhase("speaking")
      lastParamsRef.current = params ?? null
      // Invalidate previous cache entry so next cached replay is updated too
      queryClient.invalidateQueries({ queryKey: keyFromParams(params) }).catch(() => {})
      // Optionally prime cache
      queryClient.setQueryData(keyFromParams(params), buffer)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      const msg = e instanceof Error ? e.message : "Failed to play audio"
      setError(msg)
      setPhase("error")
    }
  }, [stop, queryClient])

  const pause = useCallback(() => {
    const svc = demoAudioServiceRef.current
    const ctx = svc?.getAudioContext()
    if (!svc || !ctx) return
    if (ctx.state === "running") {
      svc.pauseAudio()
      setPhase("paused")
    }
  }, [])

  const resume = useCallback(() => {
    const svc = demoAudioServiceRef.current
    const ctx = svc?.getAudioContext()
    if (!svc || !ctx) return
    if (ctx.state === "suspended") {
      svc.resumeAudio()
      setPhase("speaking")
    }
  }, [])

  const replay = useCallback(async (params?: CoachAudioParams) => {
    const p = params ?? lastParamsRef.current ?? undefined
    if (!p) return
    try {
      stop()
      setPhase("starting")
      setError(null)
      const svc = demoAudioServiceRef.current!
      await svc.initializeAudioContext()
      svc.resetAudioState()
      const cached = queryClient.getQueryData<ArrayBuffer>(keyFromParams(p))
      if (!cached) {
        const controller = new AbortController()
        fetchAbortRef.current = controller
        const buffer = await fetchCoachAudioPcm(p, controller)
        svc.addAudioChunk(buffer)
      } else {
        svc.addAudioChunk(cached)
      }
      svc.forceStart()
      setPhase("speaking")
      lastParamsRef.current = p
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      const msg = e instanceof Error ? e.message : "Failed to play audio"
      setError(msg)
      setPhase("error")
    }
  }, [stop, queryClient])

  const hasCached = useCallback((params?: CoachAudioParams) => {
    const k = keyFromParams(params ?? lastParamsRef.current ?? undefined)
    return !!queryClient.getQueryData<ArrayBuffer>(k)
  }, [queryClient])

  // Poll for playback end to revert UI to idle
  useEffect(() => {
    if (phase !== 'speaking') return
    let raf: number | null = null
    const tick = () => {
      const svc = demoAudioServiceRef.current
      if (!svc) return
      const status = svc.getStatus()
      if (!svc.speaking && status.queueLength === 0) {
        setPhase('idle')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [phase])

  return { phase, error, play, playFresh, pause, resume, replay, hasCached, stop }
}
