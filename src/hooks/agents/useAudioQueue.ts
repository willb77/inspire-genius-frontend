import { useCallback, useRef, useState } from "react";

/**
 * Audio queue for streaming TTS playback with full transport controls.
 *
 * Receives ArrayBuffer chunks of MP3 audio and plays them sequentially.
 * Each chunk plays to completion before the next begins, producing
 * smooth continuous speech from sentence-level TTS chunks.
 *
 * Controls: enqueue, stop, pause, resume, skip (next chunk), unlock (call
 * after user gesture to clear an autoplay-blocked state and replay the
 * chunk that was blocked).
 *
 * Autoplay handling
 * -----------------
 * Browsers require a user gesture before .play() succeeds with audio.
 * If we receive audio chunks before any interaction occurred (e.g. the
 * user navigates straight to Meridian without clicking first), .play()
 * rejects with NotAllowedError and the chunk is silently dropped. We
 * detect that case and expose ``isAutoplayBlocked`` + ``unlock()`` so
 * MeridianChat can surface a one-click "Enable audio" affordance. The
 * blocked buffer is held until unlock() is called so the user does not
 * lose the first reply.
 */
export function useAudioQueue() {
  const queueRef = useRef<ArrayBuffer[]>([]);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
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

      const buf = queueRef.current[0]!; // peek — keep in queue until played

      try {
        const blob = new Blob([buf], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        const playOutcome = await new Promise<"ok" | "blocked" | "error">((resolve) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          currentResolveRef.current = () => resolve("ok");

          const cleanup = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            currentResolveRef.current = null;
          };

          audio.onended = () => {
            cleanup();
            resolve("ok");
          };
          audio.onerror = () => {
            cleanup();
            resolve("error");
          };

          audio.play().catch((err: unknown) => {
            // Browser blocked autoplay (most common: NotAllowedError prior
            // to first user gesture). Keep the buffer in the queue so the
            // user can recover via unlock(). Other errors are treated like
            // playback errors — chunk dropped, queue advances.
            const name = (err as { name?: string })?.name;
            const blocked =
              name === "NotAllowedError" || name === "SecurityError";
            cleanup();
            resolve(blocked ? "blocked" : "error");
          });
        });

        if (playOutcome === "ok" || playOutcome === "error") {
          // Drop the buffer we just attempted; advance.
          queueRef.current.shift();
          updateQueueLength();
          // A successful play clears any prior blocked state — autoplay
          // may have been blocked for the first chunk but allowed after
          // a user gesture in the interim.
          if (playOutcome === "ok") setIsAutoplayBlocked(false);
          continue;
        }

        // playOutcome === "blocked": preserve buffer, surface state, pause
        // the loop. Caller invokes unlock() after a user gesture to retry.
        console.warn(
          "[useAudioQueue] Audio playback blocked by browser autoplay policy. " +
            "User must interact with the page before audio can play. " +
            "Call unlock() after a user gesture to retry.",
        );
        setIsAutoplayBlocked(true);
        break;
      } catch {
        // Bad chunk (decode error etc.). Drop + advance.
        queueRef.current.shift();
        updateQueueLength();
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

  // Unlock playback after a user gesture. Must be called from within a
  // synchronous event handler (click, touchstart, keydown). Clears the
  // blocked flag and retries the queue — the first buffer that was
  // blocked will now play because the page has a fresh user-activation.
  const unlock = useCallback(() => {
    setIsAutoplayBlocked(false);
    // Defer the play attempt to the next tick so React state flush + the
    // user-gesture token aren't competing for the same microtask.
    if (queueRef.current.length > 0 && !playingRef.current) {
      void playNext();
    }
  }, [playNext]);

  return {
    enqueue,
    stop,
    pause,
    resume,
    skip,
    seekBy,
    unlock,
    isPlaying,
    isPaused,
    isAutoplayBlocked,
    queueLength,
  };
}
