/**
 * useTTS — Unified Text-to-Speech orchestrator.
 *
 * Selects the best available TTS engine at runtime:
 *
 *   Online  + preferServer → Server TTS (OpenAI, via /v1/agents/voice/synthesize)
 *   Offline | server error → Browser TTS (SpeechSynthesis API via useTextToSpeech)
 *
 * The fallback is real and load-bearing, which is exactly why it hid a bug for
 * as long as it did: the server call pointed at `/v1/audio/tts`, a route that
 * does not exist, so every surface quietly spoke in the browser's synthetic
 * voice and nothing ever reported an error. If the voice sounds mechanical,
 * check `activeProvider` before assuming the voice ID is wrong.
 *
 * The activeProvider value tells callers which engine is running so the UI
 * can show an offline indicator when voice quality differs.
 *
 * Usage:
 *   const { speak, stop, pause, resume, activeProvider, isOnline } = useTTS();
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

export type TTSProvider = "server" | "browser";

/**
 * The voice Meridian speaks in.
 *
 * Exported so callers state the intent rather than repeating a magic string,
 * and so there is one place to change it. Matches the default MeridianChat
 * passes to `/v1/agents/voice/synthesize`.
 */
export const MERIDIAN_VOICE = "shimmer";

export type UseTTSOptions = {
  /** Prefer server-side TTS when online. Default: true */
  preferServer?: boolean;
  /** Fall back to browser SpeechSynthesis if server fails. Default: true */
  fallbackToLocal?: boolean;
  /** Server voice ID. Defaults to MERIDIAN_VOICE — the platform speaks as Meridian. */
  voice?: string;
  /** BCP-47 language tag for browser TTS fallback (e.g. "en-US"). Default: "en-US" */
  language?: string;
};

export type UseTTSReturn = {
  /** Speak text using the best available engine. */
  speak: (text: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  /** Whether the device currently has network connectivity. */
  isOnline: boolean;
  /** Which engine is currently speaking. null when idle. */
  activeProvider: TTSProvider | null;
  /** true while audio is playing. */
  speaking: boolean;
};

// ─── Server TTS helpers ──────────────────────────────────────────────────────

/**
 * POST /v1/agents/voice/synthesize → ArrayBuffer of audio/mpeg.
 * Returns null on any network or HTTP error.
 *
 * **This used to POST `/v1/audio/tts`, which does not exist.** That route 404s
 * (verified against dev), `fetchServerAudio` swallowed it and returned null,
 * and every caller silently fell through to browser SpeechSynthesis. That is
 * why the voice sounded mechanical everywhere `useTTS` is used — the goal
 * interview, Chronicle, Interview Practice — while looking like it was working.
 *
 * `/v1/agents/voice/synthesize` is the endpoint MeridianChat already uses and
 * has an API Gateway route to the agent-engine (verified: 200, audio/mpeg). It
 * goes through `agentApi` for the same reason every other `/v1/agents/*` call
 * does — the plain `api` instance would not reach the engine.
 */
async function fetchServerAudio(text: string, voice: string): Promise<ArrayBuffer | null> {
  try {
    const { agentApi } = await import("@/lib/agentApi");
    const response = await agentApi.post(
      "/v1/agents/voice/synthesize",
      // The endpoint caps input; MeridianChat slices to the same bound.
      { text: text.slice(0, 4096), voice },
      { responseType: "arraybuffer", timeout: 20_000 },
    );
    const data = response.data as ArrayBuffer;
    // A JSON error body arrives as a tiny ArrayBuffer and would fail to decode
    // as audio, so treat an implausibly small payload as a miss and let the
    // caller fall back rather than throwing inside the audio pipeline.
    if (!data || data.byteLength < 256) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Play an ArrayBuffer of audio via Web Audio API.
 * Returns a Promise that resolves when playback ends, or rejects on error.
 */
function playAudioBuffer(
  buffer: ArrayBuffer,
  audioCtxRef: React.MutableRefObject<AudioContext | null>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;

      ctx.decodeAudioData(
        buffer.slice(0),
        (decoded) => {
          const source = ctx.createBufferSource();
          source.buffer = decoded;
          source.connect(ctx.destination);
          source.onended = () => resolve();
          source.start(0);
        },
        (err) => reject(err),
      );
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTTS({
  preferServer = true,
  fallbackToLocal = true,
  // Meridian's voice. Every spoken surface on the platform is Meridian — the
  // specialists work behind her and she is the only voice a user ever hears —
  // so the default matches what MeridianChat passes rather than a per-surface
  // choice. `coral` was the old default and made the goal interview sound like
  // a different assistant from the one in the chat panel.
  voice = MERIDIAN_VOICE,
  language = "en-US",
}: UseTTSOptions = {}): UseTTSReturn {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [activeProvider, setActiveProvider] = useState<TTSProvider | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Track network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Browser TTS fallback engine
  const browserTTS = useTextToSpeech();

  const stop = useCallback(() => {
    // Stop server audio
    try {
      audioCtxRef.current?.suspend();
    } catch {
      /* best-effort */
    }
    // Stop browser TTS
    browserTTS.stop();
    setSpeaking(false);
    setActiveProvider(null);
  }, [browserTTS]);

  const pause = useCallback(() => {
    try {
      audioCtxRef.current?.suspend();
    } catch {
      /* best-effort */
    }
    browserTTS.pause();
  }, [browserTTS]);

  const resume = useCallback(() => {
    try {
      audioCtxRef.current?.resume();
    } catch {
      /* best-effort */
    }
    browserTTS.resume();
  }, [browserTTS]);

  const speak = useCallback(
    async (text: string) => {
      if (!text?.trim()) return;

      // Always stop previous playback first
      stop();

      const useServer = preferServer && isOnline;

      if (useServer) {
        console.debug("[useTTS] Using server TTS (online, preferServer=true)");
        setSpeaking(true);
        setActiveProvider("server");

        const buffer = await fetchServerAudio(text, voice);

        if (buffer) {
          try {
            await playAudioBuffer(buffer, audioCtxRef);
            console.debug("[useTTS] Server TTS playback complete");
          } catch (err) {
            console.warn("[useTTS] Server audio playback error:", err);
            if (fallbackToLocal) {
              console.debug("[useTTS] Falling back to browser TTS after playback error");
              setActiveProvider("browser");
              browserTTS.speak(text, { lang: language });
              return;
            }
          } finally {
            setSpeaking(false);
            setActiveProvider(null);
          }
          return;
        }

        // Server request failed
        if (!fallbackToLocal) {
          console.warn("[useTTS] Server TTS failed and fallbackToLocal=false");
          setSpeaking(false);
          setActiveProvider(null);
          return;
        }

        console.debug("[useTTS] Server TTS unavailable — falling back to browser TTS");
      } else {
        console.debug(
          isOnline
            ? "[useTTS] Using browser TTS (preferServer=false)"
            : "[useTTS] Using browser TTS (offline fallback)",
        );
      }

      // Browser TTS path
      if (!browserTTS.supported) {
        console.warn("[useTTS] Browser TTS not supported");
        setSpeaking(false);
        setActiveProvider(null);
        return;
      }

      setActiveProvider("browser");
      setSpeaking(true);
      browserTTS.speak(text, { lang: language });
    },
    [preferServer, isOnline, fallbackToLocal, voice, language, browserTTS, stop],
  );

  // Mirror browser TTS speaking state into our own speaking flag
  useEffect(() => {
    if (activeProvider === "browser") {
      setSpeaking(browserTTS.speaking);
      if (!browserTTS.speaking && browserTTS.phase === "idle") {
        setActiveProvider(null);
      }
    }
  }, [activeProvider, browserTTS.speaking, browserTTS.phase]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      try {
        audioCtxRef.current?.close();
      } catch {
        /* best-effort */
      }
    };
  }, []);

  return { speak, stop, pause, resume, isOnline, activeProvider, speaking };
}
