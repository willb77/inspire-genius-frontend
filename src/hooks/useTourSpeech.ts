import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DemoAudioService from "@/services/demoAudioService";
import { fetchTourAudioPcm } from "@/services/tourSpeechService";

export type TourSpeechPhase = "idle" | "starting" | "speaking" | "paused" | "error";

export function useTourSpeech() {
  const demoAudioServiceRef = useRef<DemoAudioService | null>(null);
  if (!demoAudioServiceRef.current) demoAudioServiceRef.current = new DemoAudioService();
  const fetchAbortRef = useRef<AbortController | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<TourSpeechPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const stop = useCallback(() => {
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    demoAudioServiceRef.current?.stopAudio();
    setPhase("idle");
    setError(null);
  }, []);

  const play = useCallback(async (textId: string) => {
    try {
      stop();
      setPhase("starting");
      setError(null);
      const svc = demoAudioServiceRef.current!;
      await svc.initializeAudioContext();
      svc.resetAudioState();
      const controller = new AbortController();
      fetchAbortRef.current = controller;
      const buffer = await queryClient.fetchQuery({
        queryKey: ["tour-audio", textId],
        queryFn: () => fetchTourAudioPcm(textId, controller),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      });
      svc.addAudioChunk(buffer);
      // Force start to avoid initial multi-chunk gating when we have one big buffer
      svc.forceStart();
      setPhase("speaking");
      lastIdRef.current = textId;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Failed to play audio";
      setError(msg);
      setPhase("error");
    }
  }, [stop, queryClient]);

  const pause = useCallback(() => {
    const svc = demoAudioServiceRef.current;
    const ctx = svc?.getAudioContext();
    if (!svc || !ctx) return;
    if (ctx.state === "running") {
      svc.pauseAudio();
      setPhase("paused");
    }
  }, []);

  const resume = useCallback(() => {
    const svc = demoAudioServiceRef.current;
    const ctx = svc?.getAudioContext();
    if (!svc || !ctx) return;
    if (ctx.state === "suspended") {
      svc.resumeAudio();
      setPhase("speaking");
    }
  }, []);

  const replay = useCallback(async (textId?: string) => {
    const id = textId ?? lastIdRef.current;
    if (!id) return;
    try {
      stop();
      setPhase("starting");
      setError(null);
      const svc = demoAudioServiceRef.current!;
      await svc.initializeAudioContext();
      svc.resetAudioState();
      // Use cache only (no API call) if available
      const cached = queryClient.getQueryData<ArrayBuffer>(["tour-audio", id]);
      if (!cached) {
        // Fallback: fetch once if not cached
        const controller = new AbortController();
        fetchAbortRef.current = controller;
        const buffer = await fetchTourAudioPcm(id, controller);
        svc.addAudioChunk(buffer);
      } else {
        svc.addAudioChunk(cached);
      }
      svc.forceStart();
      setPhase("speaking");
      lastIdRef.current = id;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Failed to play audio";
      setError(msg);
      setPhase("error");
    }
  }, [stop, queryClient]);

  const hasCached = useCallback((textId?: string) => {
    const id = textId ?? lastIdRef.current;
    if (!id) return false;
    return !!queryClient.getQueryData<ArrayBuffer>(["tour-audio", id]);
  }, [queryClient]);

  return { phase, error, play, pause, resume, replay, hasCached, stop };
}
