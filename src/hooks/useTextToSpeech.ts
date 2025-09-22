import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SpeakOptions = {
  rate?: number; // 0.1 - 10
  pitch?: number; // 0 - 2
  volume?: number; // 0 - 1
  lang?: string; // e.g., 'en-US'
  voiceName?: string; // attempt to pick a specific voice by name
};

export function useTextToSpeech() {
  const supported = typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
  const synth = supported ? window.speechSynthesis : (undefined as unknown as SpeechSynthesis);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const phaseRef = useRef<"idle" | "starting" | "speaking" | "paused">("idle");
  const [phase, setPhase] = useState<"idle" | "starting" | "speaking" | "paused">("idle");
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentText, setCurrentText] = useState<string>("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // load available voices
  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener("voiceschanged", load);
    return () => synth.removeEventListener("voiceschanged", load);
  }, [supported, synth]);

  // Fallback: some browsers don't fire voiceschanged; poll briefly
  useEffect(() => {
    if (!supported) return;
    if (voices.length > 0) return;
    let tries = 0;
    const id = window.setInterval(() => {
      const list = synth.getVoices();
      if (list.length > 0) {
        setVoices(list);
        clearInterval(id);
      } else if (++tries > 20) {
        clearInterval(id);
      }
    }, 150);
    return () => clearInterval(id);
  }, [supported, synth, voices.length]);

  const stop = useCallback(() => {
    if (!supported) return;
    synth.cancel();
    setSpeaking(false);
    setPaused(false);
    setCurrentText("");
    utteranceRef.current = null;
    phaseRef.current = "idle";
    setPhase("idle");
  }, [supported, synth]);

  const pause = useCallback(() => {
    if (!supported) return;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setPaused(true);
      phaseRef.current = "paused";
      setPhase("paused");
    }
  }, [supported, synth]);

  const resume = useCallback(() => {
    if (!supported) return;
    // Some engines don't reflect paused correctly; try resuming regardless
    try { synth.resume(); } catch (e) { void e; }
    setPaused(false);
    phaseRef.current = "speaking";
    setPhase("speaking");
  }, [supported, synth]);

  const pickVoice = useCallback(
    (opts?: SpeakOptions) => {
      if (!voices.length) return undefined;
      if (opts?.voiceName) {
        const v = voices.find((v) => v.name === opts.voiceName);
        if (v) return v;
      }
      if (opts?.lang) {
        const byLang = voices.find((v) => v.lang === opts.lang);
        if (byLang) return byLang;
      }
      // prefer en-* if available
      const en = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
      return en ?? voices[0];
    },
    [voices]
  );

  const speak = useCallback(
    (text: string, opts?: SpeakOptions) => {
      if (!supported || !text?.trim()) return;
      // If already speaking something else, cancel first
      if (synth.speaking || synth.paused) {
        synth.cancel();
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts?.rate ?? 1;
      u.pitch = opts?.pitch ?? 1;
      u.volume = opts?.volume ?? 1;
      const voice = pickVoice(opts);
      if (voice) u.voice = voice;
      if (opts?.lang) u.lang = opts.lang;

      u.onstart = () => {
        setSpeaking(true);
        setPaused(false);
        setCurrentText(text);
        phaseRef.current = "speaking";
        setPhase("speaking");
      };
      u.onend = () => {
        setSpeaking(false);
        setPaused(false);
        phaseRef.current = "idle";
        setPhase("idle");
      };
      u.onerror = () => {
        setSpeaking(false);
        setPaused(false);
        phaseRef.current = "idle";
        setPhase("idle");
      };
      u.onpause = () => {
        setPaused(true);
        phaseRef.current = "paused";
        setPhase("paused");
      };
      u.onresume = () => {
        setPaused(false);
        phaseRef.current = "speaking";
        setPhase("speaking");
      };

      utteranceRef.current = u;
      // Start on next tick for more reliable state propagation across browsers
      phaseRef.current = "starting";
      setPhase("starting");
      setTimeout(() => {
        try { if (synth.paused) synth.resume(); } catch (e) { void e; }
        synth.speak(u);
      }, 0);
    },
    [pickVoice, supported, synth]
  );

  const toggle = useCallback(
    (text: string, opts?: SpeakOptions) => {
      if (!supported) return;
      // Use our phase first for reliability, then engine flags as fallback
      if (phaseRef.current === "paused" || synth.paused || paused) {
        resume();
        return;
      }
      if (phaseRef.current === "speaking" || phaseRef.current === "starting" || synth.speaking || speaking) {
        pause();
        return;
      }
      // Not speaking -> start fresh
      speak(text, opts);
    },
    [supported, paused, speaking, speak, pause, resume, synth]
  );

  // Sync engine flags into React state while active
  useEffect(() => {
    if (!supported) return;
    if (!speaking && !paused) return;
    const id = window.setInterval(() => {
      try {
        setSpeaking(synth.speaking);
        setPaused(synth.paused);
      } catch (e) { void e; }
    }, 250);
    return () => clearInterval(id);
  }, [supported, speaking, paused, synth]);

  useEffect(() => () => stop(), [stop]);

  return useMemo(
    () => ({ supported, voices, phase, speaking, paused, currentText, speak, pause, resume, stop, toggle }),
    [supported, voices, phase, speaking, paused, currentText, speak, pause, resume, stop, toggle]
  );
}
