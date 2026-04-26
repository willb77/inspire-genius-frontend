import { useCallback, useRef, useState } from "react";

/**
 * Audio queue for streaming TTS playback.
 *
 * Receives ArrayBuffer chunks of MP3 audio and plays them sequentially.
 * Each chunk plays to completion before the next begins, producing
 * smooth continuous speech from sentence-level TTS chunks.
 *
 * Usage:
 *   const { enqueue, stop, isPlaying } = useAudioQueue();
 *
 *   // In WebSocket handler:
 *   useMeridianWebSocket({
 *     onAudioData: (buf) => enqueue(buf),
 *   });
 */
export function useAudioQueue() {
  const queueRef = useRef<ArrayBuffer[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playNext = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    playingRef.current = true;
    setIsPlaying(true);

    while (queueRef.current.length > 0) {
      const buf = queueRef.current.shift()!;

      try {
        const blob = new Blob([buf], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);

        await new Promise<void>((resolve) => {
          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            resolve();
          };

          audio.play().catch(() => {
            // Autoplay blocked — skip this chunk
            URL.revokeObjectURL(url);
            audioRef.current = null;
            resolve();
          });
        });
      } catch {
        // Skip bad chunks silently
      }
    }

    playingRef.current = false;
    setIsPlaying(false);
  }, []);

  const enqueue = useCallback(
    (audioBuffer: ArrayBuffer) => {
      queueRef.current.push(audioBuffer);
      // Start playing if not already
      if (!playingRef.current) {
        playNext();
      }
    },
    [playNext],
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
    playingRef.current = false;
    setIsPlaying(false);
  }, []);

  return { enqueue, stop, isPlaying };
}
