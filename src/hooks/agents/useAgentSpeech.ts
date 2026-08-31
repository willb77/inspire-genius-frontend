/**
 * useAgentSpeech — speech-to-text (browser SpeechRecognition) plus
 * text-to-speech (agent-engine `/v1/agents/voice/synthesize` → audio queue)
 * for any surface that needs to talk to Meridian without owning the whole
 * chat page.
 *
 * WHY THIS EXISTS SEPARATELY FROM MeridianChat
 * --------------------------------------------
 * `pages/user/MeridianChat.tsx` has its own inline `speakText` grown around
 * that page's WS/SSE/job delivery paths. It is deliberately NOT refactored
 * into this hook: it carries page-specific state (waveform service, autoplay
 * unlock, SSE TTS controller) and rewiring it would risk the working chat
 * surface for no user-visible gain. This hook re-implements only the parts a
 * popup needs, keeping the two behaviours that were bug fixes there:
 *
 *   1. Re-entrancy guard — a settled turn can reach TTS from more than one
 *      delivery path. Without the "already spoke this text" check, the same
 *      answer is read aloud twice (MeridianChat, 2026-08-01).
 *   2. Parallel synthesis, ordered playback — firing sentence requests
 *      sequentially caps production at ~1 sentence per round-trip, which is
 *      slower than playback and produces audible gaps (2026-06-06).
 *
 * Sentence requests share one AbortController so a new turn cancels the old
 * run instead of letting both drain into the FIFO audio queue.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { agentApi } from "@/lib/agentApi";
import { useAudioQueue } from "@/hooks/agents/useAudioQueue";

/** Longest text accepted by the synthesize endpoint in one call. */
const MAX_TTS_CHARS = 4096;
/** Sentences shorter than this are punctuation noise, not speech. */
const MIN_SENTENCE_CHARS = 3;
/** Retry backoff for 5xx/network — upstream OpenAI TTS 503s under load. */
const SYNTH_BACKOFF_MS = [0, 500, 1500];

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return (ctor as (new () => SpeechRecognitionLike) | undefined) ?? null;
}

/** True when this browser can capture speech. Used to hide the mic button. */
export function isSpeechInputSupported(): boolean {
  try {
    return getSpeechRecognitionCtor() !== null;
  } catch {
    return false;
  }
}

/**
 * Split a response into speakable sentences, stripping Markdown syntax so the
 * synthesiser does not read asterisks and backticks aloud.
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .replace(/([.!?;:])\s+/g, "$1\n")
    .split("\n")
    .map((s) => s.replace(/[*#_`~[\]]/g, "").trim())
    .filter((s) => s.length >= MIN_SENTENCE_CHARS);
}

export type UseAgentSpeechOptions = {
  /** BCP-47 language for speech recognition. Defaults to "en-US". */
  language?: string;
  /** Voice name passed to the synthesize endpoint. */
  voice?: string;
  /** Called with the final transcript when the user stops dictating. */
  onTranscript?: (transcript: string) => void;
};

export function useAgentSpeech(options: UseAgentSpeechOptions = {}) {
  const { language = "en-US", voice = "shimmer", onTranscript } = options;

  const { enqueue, stop: stopQueue, isPlaying } = useAudioQueue();

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const lastSpokenRef = useRef<string | null>(null);
  // onTranscript is read through a ref so starting/stopping dictation does not
  // need to re-subscribe when the caller passes an inline arrow function.
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stopSpeaking = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        /* already settled */
      }
      abortRef.current = null;
    }
    stopQueue();
    setIsSpeaking(false);
  }, [stopQueue]);

  /**
   * Reset the duplicate guard. Call at the start of a new turn so asking the
   * same question twice in one session still produces audio the second time.
   */
  const resetSpokenGuard = useCallback(() => {
    lastSpokenRef.current = null;
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const responseText = (text || "").trim();
      if (!responseText) return;

      // Guard 1 — this exact answer is already spoken or in flight.
      if (lastSpokenRef.current === responseText) return;
      lastSpokenRef.current = responseText;

      // Guard 2 — a newer turn supersedes an in-flight one.
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {
          /* already settled */
        }
      }

      const sentences = splitIntoSentences(responseText);
      if (sentences.length === 0) return;

      const controller = new AbortController();
      abortRef.current = controller;
      setIsSpeaking(true);

      const synthOnce = async (sentence: string): Promise<ArrayBuffer | null> => {
        for (let attempt = 0; attempt < SYNTH_BACKOFF_MS.length; attempt++) {
          if (controller.signal.aborted) return null;
          const delay = SYNTH_BACKOFF_MS[attempt];
          if (delay > 0) {
            await new Promise((r) => setTimeout(r, delay));
          }
          try {
            const res = await agentApi.post(
              "/v1/agents/voice/synthesize",
              { text: sentence.slice(0, MAX_TTS_CHARS), voice },
              {
                responseType: "arraybuffer",
                timeout: 30000,
                signal: controller.signal,
              },
            );
            return res.data as ArrayBuffer;
          } catch {
            // Fall through to the next attempt; the last failure returns null
            // so one dead sentence cannot silence the whole response.
          }
        }
        return null;
      };

      try {
        // Fire every sentence concurrently, then consume IN ORDER so playback
        // stays chronological while production runs ahead of the queue.
        const pending = sentences.map(synthOnce);
        for (const p of pending) {
          const buf = await p;
          if (controller.signal.aborted) return;
          if (buf && buf.byteLength > 0) enqueue(buf);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsSpeaking(false);
      }
    },
    [enqueue, voice],
  );

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    setError(null);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = language;
    transcriptRef.current = "";

    rec.onresult = (event: unknown) => {
      const e = event as { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) text += result[0].transcript + " ";
      }
      transcriptRef.current = text.trim();
    };

    rec.onerror = () => {
      setIsRecording(false);
      setError("Couldn't hear that — please try again.");
    };

    rec.onend = () => {
      setIsRecording(false);
      const transcript = transcriptRef.current.trim();
      if (transcript) onTranscriptRef.current?.(transcript);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsRecording(true);
    } catch {
      setError("Couldn't start the microphone.");
      setIsRecording(false);
    }
  }, [language]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // Tear down microphone + audio on unmount so a closed popup goes silent.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* not started */
      }
      try {
        abortRef.current?.abort();
      } catch {
        /* already settled */
      }
    };
  }, []);

  return {
    isRecording,
    isSpeaking: isSpeaking || isPlaying,
    error,
    speak,
    stopSpeaking,
    resetSpokenGuard,
    startRecording,
    stopRecording,
    toggleRecording,
    isSupported: isSpeechInputSupported(),
  };
}
