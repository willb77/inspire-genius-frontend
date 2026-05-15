/**
 * useVoiceDesk — VoiceDeskAI widget integration hook.
 *
 * Controls the embedded VoiceDeskAI voice agent widget.
 * Only active when VITE_VOICEDESK_ENABLED=true.
 *
 * Usage:
 *   const vd = useVoiceDesk({ userId, role, language });
 *   vd.open()       // show the voice agent panel
 *   vd.close()      // hide it
 *   vd.speak(text)  // ask the agent to speak text (tour narration)
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type UseVoiceDeskOptions = {
  /** Authenticated user ID for context */
  userId?: string;
  /** User role for context */
  role?: string;
  /** BCP-47 language tag, e.g. "en-US" */
  language?: string;
};

export type UseVoiceDeskReturn = {
  /** Whether VoiceDeskAI is enabled (env var). */
  isEnabled: boolean;
  /** Whether the VoiceDeskAI widget has loaded. */
  isLoaded: boolean;
  /** Whether the voice panel is currently expanded. */
  isOpen: boolean;
  /** Open the voice agent panel. */
  open: () => void;
  /** Close the voice agent panel. */
  close: () => void;
  /** Toggle open/close. */
  toggle: () => void;
  /**
   * Ask VoiceDeskAI to speak the given text.
   * Used for tour narration. Returns true if the speak was dispatched.
   */
  speak: (text: string) => boolean;
};

const AGENT_URL = (import.meta.env.VITE_VOICEDESK_AGENT_URL as string) || "https://vagentig.voicedeskai.co";
const IS_ENABLED = import.meta.env.VITE_VOICEDESK_ENABLED === "true";

/** postMessage channel name used to communicate with the VoiceDeskAI iframe */
const VOICEDESK_CHANNEL = "voicedesk:";

export function useVoiceDesk({
  userId,
  role,
  language = "en-US",
}: UseVoiceDeskOptions = {}): UseVoiceDeskReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Register iframe reference so postMessage can reach it
  const registerIframe = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
  }, []);

  // Expose registerIframe on window so VoiceDeskWidget can call it
  useEffect(() => {
    if (!IS_ENABLED) return;
    (window as unknown as Record<string, unknown>).__voicedeskRegister = registerIframe;
    return () => {
      delete (window as unknown as Record<string, unknown>).__voicedeskRegister;
    };
  }, [registerIframe]);

  // Listen for messages from the VoiceDeskAI iframe
  useEffect(() => {
    if (!IS_ENABLED) return;
    const handler = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      if (!event.data.startsWith(VOICEDESK_CHANNEL)) return;
      const payload = event.data.slice(VOICEDESK_CHANNEL.length);
      if (payload === "loaded") setIsLoaded(true);
      if (payload === "opened") setIsOpen(true);
      if (payload === "closed") setIsOpen(false);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  /** Send a postMessage to the VoiceDeskAI iframe */
  const postToFrame = useCallback((msg: string) => {
    const frame = iframeRef.current;
    if (!frame || !frame.contentWindow) return false;
    try {
      frame.contentWindow.postMessage(`${VOICEDESK_CHANNEL}${msg}`, AGENT_URL);
      return true;
    } catch {
      return false;
    }
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    postToFrame(JSON.stringify({ action: "open", userId, role, language }));
  }, [postToFrame, userId, role, language]);

  const close = useCallback(() => {
    setIsOpen(false);
    postToFrame(JSON.stringify({ action: "close" }));
  }, [postToFrame]);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  const speak = useCallback(
    (text: string): boolean => {
      if (!IS_ENABLED || !isLoaded) return false;
      return postToFrame(JSON.stringify({ action: "speak", text, language }));
    },
    [isLoaded, postToFrame, language],
  );

  return {
    isEnabled: IS_ENABLED,
    isLoaded,
    isOpen,
    open,
    close,
    toggle,
    speak,
  };
}

/** Export the iframe registration helper type for use in VoiceDeskWidget */
export type VoiceDeskIframeRegistrar = (el: HTMLIFrameElement | null) => void;
export { AGENT_URL as VOICEDESK_AGENT_URL, IS_ENABLED as VOICEDESK_ENABLED };
