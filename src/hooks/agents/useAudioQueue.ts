import { useCallback, useRef, useState } from "react";

/**
 * Audio queue for streaming TTS playback with full transport controls.
 *
 * Receives ArrayBuffer chunks of MP3 audio and plays them sequentially.
 * Each chunk plays to completion before the next begins, producing
 * smooth continuous speech from sentence-level TTS chunks.
 *
 * Controls: enqueue, stop, pause, resume, skip (next chunk).
 */
export function useAudioQueue() {
  const queueRef = useRef<ArrayBuffer[]>([]);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  // Resolve function for the current audio element's promise — used by skip()
  const currentResolveRef = useRef<(() => void) | null>(null);

  const updateQueueLength = useCallback(() => {
    setQueueLength(queueRef.current.length);
  }, []);

  const playNext = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    playingRef.current = true;
    setIsPlaying(true);

    while (queueRef.current.length > 0) {
      // If paused, wait until resumed
      if (pausedRef.current) {
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (!pausedRef.current) {
              clearInterval(check);
              resolve();
            }
          }, 100);
        });
      }

      const buf = queueRef.current.shift()!;
      updateQueueLength();

      try {
        const blob = new Blob([buf], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        await new Promise<void>((resolve) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          currentResolveRef.current = resolve;

          const cleanup = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            currentResolveRef.current = null;
          };

          audio.onended = () => {
            cleanup();
            resolve();
          };
          audio.onerror = () => {
            cleanup();
            resolve();
          };

          audio.play().catch(() => {
            cleanup();
            resolve();
          });
        });
      } catch {
        // Skip bad chunks silently
      }
    }

    playingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    pausedRef.current = false;
    updateQueueLength();
  }, [updateQueueLength]);

  const enqueue = useCallback(
    (audioBuffer: ArrayBuffer) => {
      queueRef.current.push(audioBuffer);
      updateQueueLength();
      if (!playingRef.current) {
        playNext();
      }
    },
    [playNext, updateQueueLength],
  );

  const stop = useCallback(() => {
    queueRef.current.length = 0;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = "";
      } catch { /* ignore */ }
      audioRef.current = null;
    }
    if (currentResolveRef.current) {
      currentResolveRef.current();
      currentResolveRef.current = null;
    }
    playingRef.current = false;
    pausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    updateQueueLength();
  }, [updateQueueLength]);

  const pause = useCallback(() => {
    if (!playingRef.current || pausedRef.current) return;
    pausedRef.current = true;
    setIsPaused(true);
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* ignore */ }
    }
  }, []);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    if (audioRef.current) {
      try { audioRef.current.play().catch(() => { /* autoplay blocked */ }); } catch { /* ignore */ }
    }
  }, []);

  const skip = useCallback(() => {
    if (!playingRef.current) return;
    // Stop the current audio element and resolve its promise
    // so playNext() advances to the next chunk
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = "";
      } catch { /* ignore */ }
      audioRef.current = null;
    }
    if (currentResolveRef.current) {
      currentResolveRef.current();
      currentResolveRef.current = null;
    }
  }, []);

  // Seek within the currently-playing chunk. Positive = forward, negative = back.
  // Clamped to [0, duration]; safe to call when nothing is playing.
  const seekBy = useCallback((seconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    const target = a.currentTime + seconds;
    const dur = Number.isFinite(a.duration) ? a.duration : target;
    const clamped = Math.max(0, Math.min(dur, target));
    try { a.currentTime = clamped; } catch { /* ignore */ }
  }, []);

  return { enqueue, stop, pause, resume, skip, seekBy, isPlaying, isPaused, queueLength };
}
