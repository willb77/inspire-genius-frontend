/**
 * useSupportAgentChat — conversation state for the floating support agent.
 *
 * ROUTING: identical to the main Meridian surface. Messages go through
 * `useMeridianJob.startJob` → `POST /v1/agents/chat/async`, which returns a
 * job id immediately and runs `meridian.respond()` in the background. That is
 * the canonical path specifically because API Gateway's HTTP API caps
 * integrations at 30s, which kills multi-agent DAG responses on the
 * synchronous endpoint (see `.claude/rules/services.md` and
 * `reference_apigw_30s_llm_route`). Completion arrives on the WS
 * `job_complete` push frame or by polling — `useMeridianJob` owns both.
 *
 * This hook does not OPEN a support ticket — a ticket is a durable record a
 * human works, and the popup keeps the "Submit a request" form as the
 * escalation path. It does, however, LOG the conversation to support-service
 * (`POST /v1/support/assistant-sessions`, status "self_served") so it appears
 * in "Your requests" alongside posted requests. Without that the surface was
 * amnesiac: a user could ask for help, get it, and find no record they had
 * ever contacted support. The write is idempotent on session id — one row per
 * conversation, not one per turn — and best-effort, because failing to log a
 * conversation must never break the conversation.
 *
 * EXPORT: reuses `exportTranscriptPdfs` so the popup emits the identical
 * branded Conversation Log + Structured Report PDFs as the full chat page —
 * same locked brand CSS, same two-document shape.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useMeridianJob, type ChatJob } from "@/hooks/agents/useMeridianJob";
import { logAssistantSession } from "@/services/support/support.service";
import {
  exportTranscriptPdfs,
  downloadBlob,
  type TranscriptMeta,
} from "@/lib/exportTranscript";
import type { ChatMessage } from "@/types/chat/data-types";

/** Shown while the async job is in flight. */
const THINKING_TEXT = "Meridian is thinking…";

const GREETING: ChatMessage = {
  id: "support-greeting",
  kind: "text",
  sender: "assistant",
  text:
    "Hi — I'm Meridian. Ask me anything about using Inspire Genius and I'll help " +
    "right here. If you need a person, use “Submit a request” and a human will pick it up.",
  time: "",
};

function formatTime(d: Date): string {
  try {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export type UseSupportAgentChatOptions = {
  /** Spoken aloud when a turn settles, if voice is on. */
  onAssistantMessage?: (text: string) => void;
  /** Cleared at the start of each turn so repeats still speak. */
  onTurnStart?: () => void;
  /** Label used for the user's turns in the exported transcript. */
  userLabel?: string;
};

export function useSupportAgentChat(options: UseSupportAgentChatOptions = {}) {
  const { onAssistantMessage, onTurnStart, userLabel = "You" } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isExporting, setIsExporting] = useState(false);

  // A stable per-mount session so multi-turn context is preserved server-side.
  const sessionIdRef = useRef<string>(
    `support-${Math.random().toString(36).slice(2)}-${new Date().getTime()}`,
  );
  const onAssistantMessageRef = useRef(onAssistantMessage);
  onAssistantMessageRef.current = onAssistantMessage;
  const onTurnStartRef = useRef(onTurnStart);
  onTurnStartRef.current = onTurnStart;

  // Mirrors the visible transcript into the requests log. Held in a ref so
  // handleJobSettled can stay dependency-free while still reading current
  // messages, and so a re-render never re-registers it.
  const messagesRef = useRef<ChatMessage[]>([GREETING]);
  const logConversationRef = useRef<(() => Promise<void>) | null>(null);
  logConversationRef.current = async () => {
    // A type predicate, not a bare `.filter`: ChatMessage is a discriminated
    // union and only the "text" variant has `.text` at all.
    const isText = (
      m: ChatMessage,
    ): m is Extract<ChatMessage, { kind: "text" }> => m.kind === "text";
    const spoken = messagesRef.current
      .filter(isText)
      .filter((m) => m.id !== "support-greeting");
    // Nothing the user actually said — do not create a row for an opened-
    // and-abandoned popup.
    if (!spoken.some((m) => m.sender === "user")) return;

    const firstUser = spoken.find((m) => m.sender === "user");
    const subject = (firstUser?.text ?? "Support conversation").slice(0, 120);
    const transcript = spoken
      .map((m) => `${m.sender === "user" ? "You" : "Meridian"}: ${m.text ?? ""}`)
      .join("\n\n")
      .slice(0, 20000);

    try {
      await logAssistantSession(sessionIdRef.current, subject, transcript);
    } catch {
      // Best-effort by design: the user is mid-conversation and a failed
      // audit write is not their problem to see.
    }
  };

  const handleJobSettled = useCallback((job: ChatJob) => {
    const time = formatTime(new Date());
    if (job.status === "error" || (!job.content && job.error)) {
      setMessages((prev) => [
        ...prev.filter((m) => m.kind !== "processing"),
        {
          id: `support-${new Date().getTime()}-err`,
          kind: "text",
          sender: "assistant",
          text:
            "Sorry — I couldn't reach the assistant just then. Please try again, " +
            "or submit a request and a person will follow up.",
          time,
        },
      ]);
      return;
    }

    const content = (job.content || "").trim();
    if (!content) return;

    setMessages((prev) => [
      ...prev.filter((m) => m.kind !== "processing"),
      {
        id: `support-${new Date().getTime()}-assistant`,
        kind: "text",
        sender: "assistant",
        text: content,
        time,
        agent: job.agent ?? undefined,
        contributingAgents: job.metadata?.contributing_agents,
        synthesized: job.metadata?.synthesized,
        ragSources: job.metadata?.rag_sources,
        attachments: job.metadata?.attachments,
      },
    ]);

    onAssistantMessageRef.current?.(content);
    void logConversationRef.current?.();
  }, []);

  const meridianJob = useMeridianJob({ onJobSettled: handleJobSettled });

  // Keep the ref aligned with state for the logger above.
  messagesRef.current = messages;

  const isBusy = useMemo(
    () => messages.some((m) => m.kind === "processing"),
    [messages],
  );

  const send = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text || isBusy) return;

      onTurnStartRef.current?.();

      const time = formatTime(new Date());
      const stamp = new Date().getTime();
      setMessages((prev) => [
        ...prev.filter((m) => m.kind !== "processing"),
        { id: `support-${stamp}-user`, kind: "text", sender: "user", text, time },
        {
          id: `support-${stamp}-processing`,
          kind: "processing",
          sender: "assistant",
          time,
          isProcessing: true,
          type: "processing",
          text: THINKING_TEXT,
        },
      ]);

      void meridianJob
        .startJob({
          message: text,
          sessionId: sessionIdRef.current,
          context: {
            session_id: sessionIdRef.current,
            // Tells Meridian this turn came from the in-app help surface so it
            // can bias toward product support rather than open coaching.
            surface: "support_popup",
          },
        })
        .catch(() => {
          setMessages((prev) => [
            ...prev.filter((m) => m.kind !== "processing"),
            {
              id: `support-${new Date().getTime()}-err`,
              kind: "text",
              sender: "assistant",
              text:
                "Sorry — I couldn't reach the assistant. Please try again, or " +
                "submit a request and a person will follow up.",
              time: formatTime(new Date()),
            },
          ]);
        });
    },
    [isBusy, meridianJob],
  );

  const clear = useCallback(() => {
    setMessages([GREETING]);
    sessionIdRef.current = `support-${Math.random().toString(36).slice(2)}-${new Date().getTime()}`;
  }, []);

  /** Emits the same dual-PDF pair as the main Meridian export. */
  const exportChat = useCallback(async () => {
    const real = messages.filter(
      (m) => m.kind === "text" && m.id !== GREETING.id,
    );
    if (real.length === 0) {
      toast.error("Nothing to export yet — ask a question first.");
      return;
    }

    setIsExporting(true);
    try {
      const meta: TranscriptMeta = {
        sessionSubject: "Help & Support",
        fromLabel: "Meridian",
        toLabel: userLabel,
        userLabel,
        slug: "support_conversation",
        assistantDomain: "Support",
      };
      const pdfs = await exportTranscriptPdfs({ messages: real, meta });
      for (const { fileName, blob } of pdfs) {
        downloadBlob(fileName, blob);
      }
      toast.success("Exported Conversation Log + Structured Report PDFs.");
    } catch (err) {
      console.error("Support transcript export failed", err);
      toast.error("Couldn't export this conversation.");
    } finally {
      setIsExporting(false);
    }
  }, [messages, userLabel]);

  return { messages, send, clear, exportChat, isBusy, isExporting };
}
