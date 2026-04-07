/**
 * useTTS — Unified Text-to-Speech orchestrator.
 *
 * Selects the best available TTS engine at runtime:
 *
 *   Online  + preferServer → Server TTS (OpenAI gpt-4o-mini-tts via /v1/audio/tts)
 *   Offline | server error → Browser TTS (SpeechSynthesis API via useTextToSpeech)
 *
 * The activeProvider value tells callers which engine is running so the UI
 * can show an offline indicator when voice quality differs.
 *
 * Usage:
 *   const { speak, stop, pause, resume, activeProvider, isOnline } = useTTS({ voice: "coral" });
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { api } from "@/lib/axios";

export type TTSProvider = "server" | "browser";

export type UseTTSOptions = {
  /** Prefer server-side TTS when online. Default: true */
  preferServer?: boolean;
  /** Fall back to browser SpeechSynthesis if server fails. Default: true */
  fallbackToLocal?: boolean;
  /** Server voice ID (e.g. "coral", "alloy"). Default: "coral" */
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
 * POST /v1/audio/tts → ArrayBuffer of audio/mp3.
 * Returns null on any network or HTTP error.
 */
async function fetchServerAudio(text: string, voice: string): Promise<ArrayBuffer | null> {
  try {
    const response = await api.post(
      "/v1/audio/tts",
      { text, voice },
      { responseType: "arraybuffer", timeout: 15_000 },
    );
    return response.data as ArrayBuffer;
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
  voice = "coral",
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
