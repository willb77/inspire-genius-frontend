/**
 * VoiceDeskWidget — Floating VoiceDeskAI voice help widget.
 *
 * Renders a fixed bottom-right floating button. Clicking it expands
 * the VoiceDeskAI agent panel. Only renders when VITE_VOICEDESK_ENABLED=true.
 *
 * Add to authenticated layouts (SidebarScaffold, AppShell) or App.tsx.
 * It is hidden on auth pages naturally because those pages do not render
 * any authenticated layout that includes this widget.
 *
 * z-index: 50 (below modals/dialogs, above all page content)
 */

import { useEffect, useRef, useState } from "react";
import { Headphones, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICEDESK_AGENT_URL, VOICEDESK_ENABLED } from "@/hooks/useVoiceDesk";

type VoiceDeskWidgetProps = {
  /** Authenticated user ID, passed as iframe context query param */
  userId?: string;
  /** User role, passed as iframe context query param */
  role?: string;
  /** Language code (BCP-47). Defaults to "en-US". */
  language?: string;
  /** Color theme. Defaults to "light". */
  theme?: "light" | "dark";
};

export default function VoiceDeskWidget({
  userId,
  role,
  language = "en-US",
  theme = "light",
}: VoiceDeskWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Register iframe reference so useVoiceDesk.speak() can reach it
  useEffect(() => {
    const register = (window as unknown as Record<string, unknown>).__voicedeskRegister as
      | ((el: HTMLIFrameElement | null) => void)
      | undefined;
    register?.(iframeRef.current);
  }, [isOpen]);

  // Expose programmatic open/speak on window for Help.tsx and useTourSpeech
  useEffect(() => {
    if (!VOICEDESK_ENABLED) return;
    const win = window as unknown as Record<string, unknown>;
    win.__voicedeskOpen = () => setIsOpen(true);
    win.__voicedeskSpeak = (text: string) => {
      if (!iframeRef.current?.contentWindow) return false;
      try {
        iframeRef.current.contentWindow.postMessage(
          `voicedesk:${JSON.stringify({ action: "speak", text, language })}`,
          VOICEDESK_AGENT_URL,
        );
        return true;
      } catch {
        return false;
      }
    };
    return () => {
      delete win.__voicedeskOpen;
      delete win.__voicedeskSpeak;
    };
  }, [language]);

  // Listen for external open trigger via CustomEvent
  useEffect(() => {
    if (!VOICEDESK_ENABLED) return;
    const handler = () => setIsOpen(true);
    window.addEventListener("voicedesk:open", handler);
    return () => window.removeEventListener("voicedesk:open", handler);
  }, []);

  // Build iframe src URL with context params
  const iframeSrc = (() => {
    const url = new URL(VOICEDESK_AGENT_URL);
    if (userId) url.searchParams.set("userId", userId);
    if (role) url.searchParams.set("role", role);
    url.searchParams.set("lang", language);
    url.searchParams.set("theme", theme);
    return url.toString();
  })();

  // Only render when enabled
  if (!VOICEDESK_ENABLED) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
      data-testid="voicedesk-widget"
    >
      {/* Expanded agent panel */}
      {isOpen && (
        <div
          className={cn(
            "w-80 sm:w-96 rounded-2xl border shadow-2xl overflow-hidden",
            "transition-all duration-300 ease-out",
            theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200",
          )}
          style={{ height: 520 }}
          role="dialog"
          aria-label="VoiceDesk voice help agent"
        >
          {/* Panel header */}
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 border-b",
              theme === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-slate-50",
            )}
          >
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-blue-500" />
              <span className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-slate-900")}>
                Voice Help
              </span>
            </div>
            <button
              aria-label="Close voice help"
              onClick={() => setIsOpen(false)}
              className={cn(
                "rounded-full p-1 transition-colors",
                theme === "dark"
                  ? "text-slate-400 hover:bg-slate-700 hover:text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Loading overlay */}
          {!isLoaded && (
            <div className="absolute inset-0 top-12 flex items-center justify-center bg-white/80">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          )}

          {/* VoiceDeskAI iframe */}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="VoiceDesk voice help agent"
            allow="microphone; autoplay"
            className="w-full h-full border-0"
            onLoad={() => {
              setIsLoaded(true);
              // Register iframe with useVoiceDesk hook
              const register = (window as unknown as Record<string, unknown>).__voicedeskRegister as
                | ((el: HTMLIFrameElement | null) => void)
                | undefined;
              register?.(iframeRef.current);
            }}
          />
        </div>
      )}

      {/* Floating trigger button */}
      <button
        aria-label={isOpen ? "Close voice help" : "Open voice help"}
        onClick={() => {
          if (!isOpen) {
            setIsLoaded(false); // reset load state on re-open
          }
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-full shadow-lg",
          "transition-all duration-200 active:scale-95",
          isOpen
            ? "bg-slate-800 hover:bg-slate-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white",
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Headphones className="h-6 w-6" />}
      </button>
    </div>
  );
}
