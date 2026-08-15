/**
 * SupportAgentPopup — floating Meridian assistant for the Help & Support
 * surface (and any other page that opts in).
 *
 * Replaces the VoiceDeskAI iframe that "Speak with Support" used to open.
 * That widget pointed at a third-party agent and only rendered when
 * VITE_VOICEDESK_ENABLED was true, so on most builds the button did nothing.
 * This popup talks to the platform's own Meridian pipeline instead.
 *
 * Mounted once by `SupportAgentProvider`; opened imperatively via
 * `useSupportAgent().open()` so any page can surface it in one line.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Download,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAgentSpeech } from "@/hooks/agents/useAgentSpeech";
import { useSupportAgentChat } from "@/hooks/support/useSupportAgentChat";

export type SupportAgentPopupProps = {
  open: boolean;
  onClose: () => void;
  /** Display name used for the user's turns in the exported transcript. */
  userLabel?: string;
  /** Heading shown in the popup chrome. */
  title?: string;
};

export default function SupportAgentPopup({
  open,
  onClose,
  userLabel = "You",
  title = "Ask Meridian",
}: SupportAgentPopupProps) {
  // Voice output is opt-in and remembered — a help popup that starts talking
  // unprompted in an open-plan office is worse than one that stays quiet.
  const [voiceOn, setVoiceOn] = useState(() => {
    try {
      return localStorage.getItem("support_agent_voice") === "true";
    } catch {
      return false;
    }
  });
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const speech = useAgentSpeech({
    onTranscript: (transcript) => {
      // Dictation sends straight away — the user already "said" it.
      sendRef.current?.(transcript);
    },
  });

  const chat = useSupportAgentChat({
    userLabel,
    onTurnStart: () => speech.resetSpokenGuard(),
    onAssistantMessage: (text) => {
      if (voiceOn) void speech.speak(text);
    },
  });

  // `useAgentSpeech` needs to send, and `useSupportAgentChat` needs to speak —
  // a ref breaks the declaration cycle without reordering the hooks.
  const sendRef = useRef<((text: string) => void) | null>(null);
  sendRef.current = chat.send;

  const { messages, isBusy } = chat;

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Focus the composer when the popup opens.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Close on Escape, and silence any in-flight speech on the way out.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        speech.stopSpeaking();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, speech]);

  const toggleVoice = useCallback(() => {
    setVoiceOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("support_agent_voice", String(next));
      } catch {
        /* private mode — setting is session-only */
      }
      if (!next) speech.stopSpeaking();
      return next;
    });
  }, [speech]);

  const submitDraft = useCallback(() => {
    const text = draft.trim();
    if (!text || isBusy) return;
    setDraft("");
    chat.send(text);
  }, [draft, isBusy, chat]);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[min(26rem,calc(100vw-3rem))]"
      role="dialog"
      aria-label="Ask Meridian — support assistant"
      data-testid="support-agent-popup"
    >
      <div className="flex flex-col rounded-2xl border bg-white shadow-2xl overflow-hidden h-[min(34rem,calc(100vh-6rem))]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
              <Bot className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {isBusy ? "Thinking…" : "AI support assistant"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={voiceOn ? "Turn voice replies off" : "Turn voice replies on"}
              aria-pressed={voiceOn}
              onClick={toggleVoice}
            >
              {voiceOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Export this conversation"
              disabled={chat.isExporting}
              onClick={() => void chat.exportChat()}
            >
              {chat.isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Start a new conversation"
              onClick={() => {
                speech.stopSpeaking();
                chat.clear();
              }}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Close support assistant"
              onClick={() => {
                speech.stopSpeaking();
                onClose();
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m) => {
            if (m.kind === "processing") {
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 animate-spin" />
                  <span>{m.text}</span>
                </div>
              );
            }
            if (m.kind !== "text") return null;
            const isUser = m.sender === "user";
            return (
              <div
                key={m.id}
                className={cn("flex", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    isUser
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-900 rounded-bl-sm",
                  )}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="border-t p-3">
          {speech.error && (
            <p className="mb-2 text-xs text-red-600" role="alert">
              {speech.error}
            </p>
          )}
          <div className="flex items-end gap-2">
            {speech.isSupported && (
              <Button
                type="button"
                variant={speech.isRecording ? "default" : "outline"}
                size="icon"
                className="size-9 shrink-0"
                aria-label={speech.isRecording ? "Stop dictating" : "Dictate a message"}
                aria-pressed={speech.isRecording}
                onClick={speech.toggleRecording}
              >
                {speech.isRecording ? (
                  <MicOff className="size-4" />
                ) : (
                  <Mic className="size-4" />
                )}
              </Button>
            )}
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter is a newline.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitDraft();
                }
              }}
              rows={1}
              placeholder={
                speech.isRecording ? "Listening…" : "Ask about Inspire Genius…"
              }
              aria-label="Message"
              className="min-h-9 max-h-28 resize-none py-2"
            />
            <Button
              type="button"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Send message"
              disabled={!draft.trim() || isBusy}
              onClick={submitDraft}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
