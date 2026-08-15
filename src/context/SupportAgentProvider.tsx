/**
 * SupportAgentProvider — mounts the floating Meridian support assistant once
 * and exposes imperative open/close to every page beneath it.
 *
 * Mount it inside the authenticated layout (SidebarScaffold) so the popup is
 * unavailable on auth pages, which have no session to talk to Meridian with.
 *
 * Exposing it on another page is then one line:
 *   const { open } = useSupportAgent()
 *
 * A legacy `voicedesk:open` CustomEvent listener is kept so existing triggers
 * (Help.tsx before this change, useTourSpeech) light up the new assistant
 * instead of silently doing nothing when VITE_VOICEDESK_ENABLED is unset.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import SupportAgentPopup from "@/components/support/SupportAgentPopup";
import { SupportAgentContext, type SupportAgentContextValue } from "./support-agent-context";

export type SupportAgentProviderProps = {
  children: ReactNode;
  /** Display name for the user's turns in exported transcripts. */
  userLabel?: string;
};

export function SupportAgentProvider({ children, userLabel }: SupportAgentProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("support-agent:open", handler);
    // Legacy alias — see file header.
    window.addEventListener("voicedesk:open", handler);
    return () => {
      window.removeEventListener("support-agent:open", handler);
      window.removeEventListener("voicedesk:open", handler);
    };
  }, []);

  const value = useMemo<SupportAgentContextValue>(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return (
    <SupportAgentContext.Provider value={value}>
      {children}
      <SupportAgentPopup open={isOpen} onClose={close} userLabel={userLabel} />
    </SupportAgentContext.Provider>
  );
}

export default SupportAgentProvider;
