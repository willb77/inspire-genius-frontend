/**
 * SupportAgentProvider — mounts the Help & Support assistant once and exposes
 * imperative open/close to every page beneath it.
 *
 * Mounted by BOTH layout families, because the app has two and they do not
 * nest: `SidebarScaffold` (User, SuperAdmin, Unified) and `AppShell` (Manager,
 * CompanyAdmin, Distributor, Practitioner). Mounting in only one leaves four
 * roles with no assistant, which is what happened before this change.
 *
 * Not mounted on auth pages — those render no authenticated layout, and there
 * is no session to talk to Meridian with.
 *
 * Re-entrant by design: if a provider is already above us, render children and
 * nothing else. A nested mount would otherwise put two launchers and two
 * popups on screen, each with its own conversation. Cheap insurance against a
 * future layout that wraps one family in the other.
 */
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import SupportAgentPopup from "@/components/support/SupportAgentPopup";
import SupportAgentLauncher from "@/components/support/SupportAgentLauncher";
import { SupportAgentContext, type SupportAgentContextValue } from "./support-agent-context";

export type SupportAgentProviderProps = {
  children: ReactNode;
  /** Display name for the user's turns in exported transcripts. */
  userLabel?: string;
  /**
   * Set false to mount the assistant without the floating button — for a
   * surface that provides its own trigger and wants the corner clear.
   */
  showLauncher?: boolean;
};

export function SupportAgentProvider({
  children,
  userLabel,
  showLauncher = true,
}: SupportAgentProviderProps) {
  const existing = useContext(SupportAgentContext);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Hooks must run unconditionally, so this effect is registered even when an
  // outer provider makes it redundant; the early return below happens after.
  useEffect(() => {
    if (existing) return;
    const handler = () => setIsOpen(true);
    window.addEventListener("support-agent:open", handler);
    // Legacy alias. HelpV2's "Speak with Support" still dispatches this, and
    // older triggers elsewhere may too — keeping it means they open the real
    // assistant instead of a VoiceDesk iframe that is flag-gated off.
    window.addEventListener("voicedesk:open", handler);
    return () => {
      window.removeEventListener("support-agent:open", handler);
      window.removeEventListener("voicedesk:open", handler);
    };
  }, [existing]);

  const value = useMemo<SupportAgentContextValue>(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  // Already inside a provider — defer to it entirely.
  if (existing) return <>{children}</>;

  return (
    <SupportAgentContext.Provider value={value}>
      {children}
      {showLauncher && <SupportAgentLauncher />}
      <SupportAgentPopup open={isOpen} onClose={close} userLabel={userLabel} />
    </SupportAgentContext.Provider>
  );
}

export default SupportAgentProvider;
