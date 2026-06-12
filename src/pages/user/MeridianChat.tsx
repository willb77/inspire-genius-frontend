import UserLayout from "@/layouts/UserLayout";
import ChatHistory from "@/components/user/chat/ChatHistory";
import ChatWindow from "@/components/user/chat/ChatWindow";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HistoryGroup, ChatMessage, RAGSource } from "@/types/chat";
import { useAuth } from "@/context/useAuth";
import { useAgentConversation } from "@/hooks/agents/useAgentConversation";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateConversation } from "@/hooks/agents/useCreateConversation";
import { useConversationMessagesInfinite } from "@/hooks/agents/useConversationMessagesInfinite";
import { useDeleteConversation } from "@/hooks/agents/useDeleteConversation";
import { useRenameConversation } from "@/hooks/agents/useRenameConversation";
import { useMeridianWebSocket } from "@/hooks/agents/useMeridianWebSocket";
import type { MeridianResponse } from "@/hooks/agents/useMeridianWebSocket";
import { useMeridianJob } from "@/hooks/agents/useMeridianJob";
import type { ChatJob } from "@/hooks/agents/useMeridianJob";
import { useMeridianSSEStream } from "@/hooks/agents/useMeridianSSEStream";
import { PreflightAsyncRedirectError } from "@/services/agent/meridianChatStream";
import { SentenceStreamer } from "@/lib/sentenceStreamer";
import { isStreamTextResponsesEnabled } from "@/lib/streamingFlag";
import { useAudioQueue } from "@/hooks/agents/useAudioQueue";
import DemoAudioService from "@/services/demoAudioService";
import { secureGetItem, secureSetItem, secureRemoveItem } from "@/lib/secureStorage";
import { useListDocuments } from "@/hooks/documents/useListDocuments";
import { useDownloadDocument } from "@/hooks/documents/useDownloadDocument";
import { useDeleteDocument } from "@/hooks/documents/useDeleteDocument";
import { api } from "@/lib/axios";
import { getApi as getAgentApi } from "@/lib/agentApi";
import { exportConversation } from "@/services/agent/agentService";
import { toast } from "sonner";
// Agent engine toggle is handled internally by conversation hooks/services
import { format } from "date-fns";
import { MultiAgentIndicator } from "@/components/shared/MultiAgentIndicator";
import {
  Sparkles,
  Wifi,
  WifiOff,
  Loader2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  SkipForward,
  Rewind,
  FastForward,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractSessionId(resp: unknown): string | undefined {
  try {
    if (!resp || typeof resp !== "object") return undefined;
    const r = resp as Record<string, unknown>;
    const data = (r.data ?? r) as Record<string, unknown>;
    const convo = data.conversation as Record<string, unknown> | undefined;
    const session = data.session as Record<string, unknown> | undefined;
    return (
      (typeof convo?.id === "string" ? convo.id : undefined) ||
      (typeof session?.conversation_id === "string" ? session.conversation_id : undefined) ||
      (typeof session?.id === "string" ? session.id : undefined) ||
      (typeof data.conversation_id === "string" ? (data.conversation_id as string) : undefined) ||
      (typeof data.id === "string" ? (data.id as string) : undefined)
    );
  } catch {
    return undefined;
  }
}

function formatUSTimeSafe(input: unknown): string {
  try {
    let d: Date;
    if (input instanceof Date) d = input;
    else if (typeof input === "string" || typeof input === "number") d = new Date(input);
    else d = new Date();
    return isNaN(d.getTime())
      ? format(new Date(), "do MMM yy, hh:mm a")
      : format(d, "do MMM yy, hh:mm a");
  } catch {
    return format(new Date(), "do MMM yy, hh:mm a");
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AGENT_ID = "meridian";
const COACH_NAME = "Meridian";

export default function MeridianChat() {
  const navigate = useNavigate();

  const { user } = useAuth();
  const accessToken = user?.token ?? "";

  // Local UI state
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const demoAudioServiceRef = useRef<DemoAudioService | null>(null);
  if (!demoAudioServiceRef.current) demoAudioServiceRef.current = new DemoAudioService();
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastMessageRef = useRef<{ type: string; text: string }>({ type: "", text: "" });
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [statusBanner, setStatusBanner] = useState<
    { type: "success" | "error" | "info"; text: string } | undefined
  >(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [audioPlayerBuffer, setAudioPlayerBuffer] = useState<AudioBuffer | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(true);
  const audioBufferUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioBufferUpdateInFlightRef = useRef(false);
  const lastCombinedLengthRef = useRef(0);
  const audioBufferFirstRefreshScheduledRef = useRef(false);

  // Text send queued while the Meridian WS is reconnecting. Flushed in
  // onResponse on the next "connected" frame. We escape API GW HTTP API's
  // 30s integration cap by routing text chat through the WS — but if the
  // socket isn't open yet we hold the message instead of falling back to
  // the REST endpoint that triggers the cap (multi-agent DAG answers run
  // 45–90s).
  const pendingSendRef = useRef<
    { text: string; fileIds: string[]; convId: string | undefined } | null
  >(null);
  const wsSendMessageRef = useRef<
    | ((
        text: string,
        context?: Record<string, unknown>,
        fileIds?: string[],
        options?: { voice?: boolean; gender?: string; accent?: string },
      ) => void)
    | null
  >(null);

  // Agent attribution from WS
  const [agentAttribution, setAgentAttribution] = useState<string | null>(null);

  // Session-level multi-agent collaboration tracking (last synthesized response)
  const [lastCollaboration, setLastCollaboration] = useState<{
    contributingAgents: string[];
    synthesized: boolean;
  } | null>(null);

  // ── Browser-based voice input (bypasses WS) ──────────────────
  const [voiceRecording, setVoiceRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef("");

  // 2026-06-04: Tracks whether the in-flight WS response delivered any
  // `type: "audio"` frames. The ws-proxy Lambda forwards chat to the
  // agent-engine's REST endpoint (no streaming TTS), so voice-enabled
  // sessions through API Gateway WS never receive audio frames. When the
  // `complete` frame lands with zero audio frames, fall back to the
  // per-sentence REST synthesize path used by the async-jobs flow.
  const wsHasAudioRef = useRef(false);

  // Documents
  const { data: fileServiceList, isLoading: docsLoading } = useListDocuments(1, 10);
  const downloadMutation = useDownloadDocument();
  const deleteMutation = useDeleteDocument();

  const docSections = useMemo(() => {
    type ApiFile = {
      id: string;
      filename: string;
      file_key: string;
      file_type: string;
      created_at: string;
      temp_url?: string;
      category_name?: string;
    };
    type ApiGroup = { date_label: string; date: string; files: ApiFile[] };
    const apiGroups = (fileServiceList as { date_groups?: ApiGroup[] } | undefined)?.date_groups;
    if (Array.isArray(apiGroups) && apiGroups.length) {
      const base = (api.defaults.baseURL as string) || "";
      const baseClean = base.replace(/\/+$/, "");
      const joinUrl = (fileKey: string) => `${baseClean}/${fileKey.replace(/^\/+/, "")}`;
      const kindFromApi = (t?: string) => {
        const k = String(t || "").toLowerCase();
        if (k === "pdf") return "pdf" as const;
        if (k === "csv") return "csv" as const;
        if (k === "ppt" || k === "pptx") return "ppt" as const;
        return "doc" as const;
      };
      return apiGroups
        .map((g) => ({
          title: g.date_label || g.date,
          items: (g.files || []).map((f: ApiFile) => ({
            id: f.id,
            name: f.filename,
            kind: kindFromApi(f.file_type),
            url: joinUrl(f.file_key),
            tempUrl: f.temp_url,
          })),
        }))
        .filter((sec) => sec.items.length > 0);
    }
    return [] as Array<{
      title: string;
      items: Array<{
        id: string;
        name: string;
        kind: "pdf" | "csv" | "ppt" | "doc";
        url?: string;
        tempUrl?: string;
      }>;
    }>;
  }, [fileServiceList]);

  const selectedDocNames = useMemo(() => {
    if (!selectedFileIds.length) return [] as string[];
    const flat = docSections.flatMap((s) => s.items);
    const map = new Map(flat.map((d) => [d.id, d.name] as const));
    return selectedFileIds.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [docSections, selectedFileIds]);

  const docOnDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        setSelectedFileIds((prev) => prev.filter((x) => x !== id));
      } catch {
        // swallow
      }
    },
    [deleteMutation],
  );

  const docOnDownload = useCallback(
    async (id: string) => {
      try {
        const link = await downloadMutation.mutateAsync(id);
        const a = document.createElement("a");
        a.href = link;
        a.rel = "noopener noreferrer";
        a.target = "_blank";
        a.click();
        a.remove();
      } catch {
        // swallow
      }
    },
    [downloadMutation],
  );

  // Audio buffer refresh — drives waveform visualization via DemoAudioService.
  // Streaming TTS uses useAudioQueue instead but this is kept for the audio player.
  const scheduleAudioBufferRefresh = useCallback(() => {
    if (audioBufferUpdateTimeoutRef.current) return;
    const delay = audioBufferFirstRefreshScheduledRef.current ? 1200 : 50;
    audioBufferFirstRefreshScheduledRef.current = true;
    audioBufferUpdateTimeoutRef.current = setTimeout(() => {
      audioBufferUpdateTimeoutRef.current = null;
      const svc = demoAudioServiceRef.current;
      if (!svc || !svc.getCombinedAudioBuffer) return;
      if (audioBufferUpdateInFlightRef.current) return;
      audioBufferUpdateInFlightRef.current = true;
      svc
        .getCombinedAudioBuffer()
        .then((buf) => {
          if (!buf) return;
          if (buf.length <= lastCombinedLengthRef.current) return;
          const delta = buf.length - lastCombinedLengthRef.current;
          if (lastCombinedLengthRef.current > 0 && delta < buf.sampleRate * 0.8 && svc.speaking)
            return;
          lastCombinedLengthRef.current = buf.length;
          setAudioPlayerBuffer(buf);
        })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          audioBufferUpdateInFlightRef.current = false;
        });
    }, delay);
  }, []);

  // -------------------------------------------------------------------
  // WebSocket response handler
  // -------------------------------------------------------------------

  // Hoisted ahead of `onResponse` so the complete-frame handler can
  // invalidate the conversation list cache without waiting for the
  // 30s staleTime — fresh chats now appear in History immediately.
  const queryClientWs = useQueryClient();

  // Single rendering path for a settled assistant turn. Used by both
  // the WS `complete` frame and the async-jobs `job_complete` / poll
  // settlement path so the in-flight bubble swap happens identically
  // regardless of how the response arrived.
  const renderAssistantComplete = useCallback(
    (input: {
      content: string;
      agent?: string | null;
      metadata?: MeridianResponse["metadata"];
    }) => {
      const { content, agent, metadata } = input;
      if (agent) setAgentAttribution(agent);
      const ragSources = metadata?.rag_sources?.filter((s) => s.filename) ?? [];
      const contributingAgents = metadata?.contributing_agents;
      const synthesized = metadata?.synthesized;
      const assistantMessageId =
        (metadata as { assistant_message_id?: string } | undefined)?.assistant_message_id
          ?? `msg-${Date.now()}`;

      if (synthesized && contributingAgents && contributingAgents.length > 1) {
        setLastCollaboration({ contributingAgents, synthesized: true });
      }

      if (content) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.kind !== "processing");
          const lastMsg = filtered[filtered.length - 1];
          if (lastMsg && lastMsg.sender === "assistant" && lastMsg.kind === "text") {
            return [
              ...filtered.slice(0, -1),
              {
                ...lastMsg,
                id: assistantMessageId,
                text: content,
                agent: agent ?? undefined,
                ragSources: ragSources.length > 0 ? ragSources : undefined,
                contributingAgents,
                synthesized,
              },
            ];
          }
          return [
            ...filtered,
            {
              id: assistantMessageId,
              kind: "text" as const,
              sender: "assistant" as const,
              text: content,
              time: formatUSTimeSafe(new Date()),
              agent: agent ?? undefined,
              ragSources: ragSources.length > 0 ? ragSources : undefined,
              contributingAgents,
              synthesized,
            },
          ];
        });
      }
      lastMessageRef.current = { type: "complete", text: content };

      // Refresh History without waiting for staleTime.
      try {
        queryClientWs.invalidateQueries({
          queryKey: ["agent", "conversation"],
          exact: false,
        });
      } catch {
        // never break over a cache miss
      }
    },
    [queryClientWs],
  );

  // -------------------------------------------------------------------
  // Async-jobs (POST /v1/agents/chat/async + poll + WS push)
  // -------------------------------------------------------------------

  const handleJobSettled = useCallback(
    (job: ChatJob) => {
      if (job.status === "error") {
        setStatusBanner({ type: "error", text: job.error || "Agent error" });
        setMessages((prev) => [
          ...prev.filter((m) => m.kind !== "processing"),
          {
            id: `msg-${Date.now()}-err`,
            kind: "text" as const,
            sender: "assistant" as const,
            text: "Sorry, I couldn't reach Meridian. Please try again.",
            time: formatUSTimeSafe(new Date()),
          },
        ]);
        return;
      }
      const content = job.content ?? "";
      renderAssistantComplete({
        content,
        agent: job.agent,
        metadata: job.metadata as MeridianResponse["metadata"],
      });
      // 2026-06-03 fix: text-input chat path was never wired to TTS, so
      // typed questions returned text-only even with voice toggle on.
      // The voice-input path already speaks via the WS streaming-TTS or
      // the speakText fallback; mirror that here so the toggle controls
      // BOTH input modalities. Guard on voiceEnabled so the mute toggle
      // wins. Errors are swallowed inside speakText so this is fire-and-forget.
      if (content && voiceEnabledRef.current) {
        void speakTextRef.current?.(content);
      }
    },
    [renderAssistantComplete],
  );

  const meridianJob = useMeridianJob({ onJobSettled: handleJobSettled });
  const meridianJobRef = useRef(meridianJob);
  meridianJobRef.current = meridianJob;

  // Warmup ping on mount — hits the cheap GET /v1/agents/health endpoint
  // on the agent-engine ECS task so the first real question doesn't pay
  // cold-start latency. ECS task warming happens during the user's typing
  // window. Best-effort: failures are swallowed (the retry-with-backoff
  // in startJob handles actual cold-start cases). Fires once on mount;
  // intentional empty deps array.
  useEffect(() => {
    const ac = new AbortController();
    try {
      const promise = getAgentApi().get("/v1/agents/health", { signal: ac.signal });
      // Defensive — under test mocks `getAgentApi()` may not return a
      // real axios instance.  Only chain when we actually got a thenable.
      if (promise && typeof (promise as { catch?: unknown }).catch === "function") {
        (promise as Promise<unknown>).catch(() => {
          // Swallow — best-effort warmup. The retry-with-backoff in
          // startJob handles real cold-start cases.
        });
      }
    } catch {
      // Same — never let warmup throw out of the effect.
    }
    return () => ac.abort();
  }, []);

  const onResponse = useCallback(
    (resp: MeridianResponse) => {
      // Route async-jobs push frames (job_complete / job_progress /
      // job_error) to the hook so we can short-circuit polling and
      // render the settled bubble through handleJobSettled.
      if (meridianJobRef.current.notifyPushFrame(resp)) return;

      if (resp.type === "connected") {
        setStatusBanner({ type: "success", text: "Connected to Meridian" });
        // Flush any text message queued while the socket was reconnecting.
        const pending = pendingSendRef.current;
        if (pending) {
          pendingSendRef.current = null;
          wsSendMessageRef.current?.(
            pending.text,
            { conversation_id: pending.convId, session_id: pending.convId || "default" },
            pending.fileIds,
          );
        }
        return;
      }

      if (resp.type === "processing") {
        wsHasAudioRef.current = false;
        return;
      }

      if (resp.type === "error") {
        setStatusBanner({ type: "error", text: resp.message || "Agent error" });
        lastMessageRef.current = { type: "error", text: resp.message ?? "" };
        wsHasAudioRef.current = false;
        // Replace the "Meridian is thinking…" placeholder with the same
        // error bubble the REST path used to render. Preserves existing UX.
        setMessages((prev) => [
          ...prev.filter((m) => m.kind !== "processing"),
          {
            id: `msg-${Date.now()}-err`,
            kind: "text" as const,
            sender: "assistant" as const,
            text: "Sorry, I couldn't reach Meridian. Please try again.",
            time: formatUSTimeSafe(new Date()),
          },
        ]);
        return;
      }

      if (resp.type === "token") {
        const text = resp.content ?? "";
        if (!text) return;
        // Track agent for attribution
        if (resp.agent) setAgentAttribution(resp.agent);
        // Accumulate streaming text — replace the last assistant message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.kind !== "processing");
          const lastMsg = filtered[filtered.length - 1];
          if (lastMsg && lastMsg.sender === "assistant" && lastMsg.kind === "text") {
            // Append to existing streaming message
            return [
              ...filtered.slice(0, -1),
              { ...lastMsg, text: lastMsg.text + text },
            ];
          }
          // First token — create new assistant message
          return [
            ...filtered,
            {
              id: `msg-${Date.now()}`,
              kind: "text" as const,
              sender: "assistant" as const,
              text,
              time: formatUSTimeSafe(new Date()),
            },
          ];
        });
        lastMessageRef.current = { type: "token", text };
        return;
      }

      if (resp.type === "complete") {
        const content = resp.content ?? "";
        renderAssistantComplete({
          content,
          agent: resp.agent,
          metadata: resp.metadata,
        });
        // Fall back to per-sentence REST TTS when the WS path delivered
        // zero `type: "audio"` frames. Happens on the ws-proxy → REST
        // forwarding path, which strips voice streaming entirely.
        if (content && !wsHasAudioRef.current && voiceEnabledRef.current) {
          void speakTextRef.current?.(content);
        }
        wsHasAudioRef.current = false;
        return;
      }
    },
    [renderAssistantComplete],
  );

  // Voice-enabled toggle: when ON, WS messages include voice=true for streaming TTS
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem("meridian_voice") !== "false"; } catch { return true; }
  });

  // ── Streaming audio queue (sentence-level TTS chunks from WebSocket) ──
  const {
    enqueue: enqueueAudio,
    stop: stopAudio,
    pause: pauseAudio,
    resume: resumeAudio,
    skip: skipAudio,
    seekBy: seekAudio,
    unlock: unlockAudio,
    isPlaying: isAudioPlaying,
    isPaused: isAudioQueuePaused,
    isAutoplayBlocked: isAudioAutoplayBlocked,
    queueLength: audioQueueLength,
  } = useAudioQueue();

  // 2026-06-03 fix: unlock audio on first user interaction with the
  // chat surface. Browsers require a user gesture before .play() will
  // resolve; without this, the very first TTS chunk after a fresh page
  // load is silently dropped (NotAllowedError in useAudioQueue). One
  // document-level click handler attached on mount, removed after first
  // fire. Best-effort: failures are swallowed since unlock() is safe to
  // call when no audio is queued.
  useEffect(() => {
    const onFirstInteraction = () => {
      try {
        unlockAudio();
      } catch {
        // ignore
      }
      document.removeEventListener("click", onFirstInteraction, true);
      document.removeEventListener("keydown", onFirstInteraction, true);
      document.removeEventListener("touchstart", onFirstInteraction, true);
    };
    document.addEventListener("click", onFirstInteraction, true);
    document.addEventListener("keydown", onFirstInteraction, true);
    document.addEventListener("touchstart", onFirstInteraction, true);
    return () => {
      document.removeEventListener("click", onFirstInteraction, true);
      document.removeEventListener("keydown", onFirstInteraction, true);
      document.removeEventListener("touchstart", onFirstInteraction, true);
    };
  }, [unlockAudio]);

  // Stream cancellation: tracks in-flight TTS requests so Cancel can abort
  // the per-sentence /v1/agents/voice/synthesize loop, not just stop the queue.
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsCancelledRef = useRef(false);

  // Streaming-TTS sentence queue (T22 voice streaming, flag-gated).
  // Each sentence emitted by SentenceStreamer triggers a TTS POST
  // immediately; results are drained into the audio queue in document
  // order so a fast 2nd sentence never plays before a slow 1st.
  // See `docs/architecture/voice_streaming_design_2026-06-11.md` §7 for
  // the order-preservation rationale.
  const ttsStreamingQueueRef = useRef<Array<Promise<ArrayBuffer | null>>>([]);
  const ttsStreamingDrainerRef = useRef<Promise<void> | null>(null);

  /**
   * T22 streaming voice path — feeds incoming SSE tokens through
   * `SentenceStreamer` so each completed sentence fires its TTS call
   * immediately, instead of waiting for the full response. Drops ~20s
   * off perceived first-audio latency. Returns null when the client
   * streaming flag is OFF — caller should fall through to `speakText`.
   *
   * Voice param defaults to `"shimmer"` (matches `speakText` and the
   * agent voice-config), preserving the per-agent voice differentiation
   * required by memory `feedback_voice_settings_fix.md`. Callers that
   * know the agent voice should pass it through.
   *
   * Returned controller:
   *   `push(token)` — call for each SSE `event: token` frame
   *   `finish()`    — call after `event: complete` to flush the tail
   *   `cancel()`    — abort in-flight TTS (Cancel button / unmount)
   */
  const createStreamingTtsController = useCallback(
    (voice: string = "shimmer") => {
      // Flag default: OFF. Backend independently 404s when its flag is
      // off → upstream SSE call falls back, we never reach here.
      // Per memory `project_staging_b_target_env_strategy.md`, Bill flips
      // the flag — same code in all envs.
      if (!isStreamTextResponsesEnabled()) return null;

      const controller = new AbortController();
      ttsAbortRef.current = controller;
      ttsCancelledRef.current = false;
      ttsStreamingQueueRef.current = [];

      let tokenP: Promise<string> | null = null;
      const resolveToken = async (): Promise<string> => {
        if (tokenP) return tokenP;
        tokenP = (async () => {
          let t = accessToken;
          if (!t) {
            try {
              const { getToken } = await import("@/lib/storage");
              t = (await getToken()) || "";
            } catch { /* ignore */ }
          }
          return t || "";
        })();
        return tokenP;
      };

      const postSentence = async (
        sentence: string,
      ): Promise<ArrayBuffer | null> => {
        try {
          const { agentApi } = await import("@/lib/agentApi");
          const t = await resolveToken();
          const r = await agentApi.post(
            "/v1/agents/voice/synthesize",
            { text: sentence.slice(0, 4096), voice },
            {
              headers: t ? { "access-token": t } : {},
              responseType: "arraybuffer",
              timeout: 30000,
              signal: controller.signal,
            },
          );
          return r.data && r.data.byteLength > 0 ? r.data : null;
        } catch {
          return null;
        }
      };

      const startDrainer = () => {
        if (ttsStreamingDrainerRef.current) return;
        ttsStreamingDrainerRef.current = (async () => {
          try {
            // Drain while there's work and we're not cancelled. The
            // streamer pushes onto the queue from the SSE consumer
            // thread; we await each promise in FIFO order to preserve
            // playback order.
            while (!ttsCancelledRef.current) {
              const promise = ttsStreamingQueueRef.current.shift();
              if (!promise) {
                if (finished.value) break;
                // Idle — yield briefly for more pushes.
                await new Promise((r) => setTimeout(r, 25));
                continue;
              }
              const audio = await promise;
              if (ttsCancelledRef.current) break;
              if (audio) enqueueAudio(audio);
            }
          } finally {
            ttsStreamingDrainerRef.current = null;
          }
        })();
      };

      const streamer = new SentenceStreamer({
        onSentence: (sentence) => {
          if (ttsCancelledRef.current) return;
          const clean = sentence.replace(/[*#_`~[\]]/g, "").trim();
          if (clean.length < 3) return;
          setHasAudio(true);
          ttsStreamingQueueRef.current.push(postSentence(clean));
          startDrainer();
        },
      });

      const finished = { value: false };

      return {
        push: (token: string) => {
          if (ttsCancelledRef.current || finished.value) return;
          streamer.push(token);
        },
        finish: () => {
          if (finished.value) return;
          finished.value = true;
          streamer.flushFinal();
          // Drainer auto-stops once queue empties + finished is true.
          if (ttsAbortRef.current === controller) ttsAbortRef.current = null;
        },
        cancel: () => {
          ttsCancelledRef.current = true;
          try { controller.abort(); } catch { /* ignore */ }
          if (ttsAbortRef.current === controller) ttsAbortRef.current = null;
          ttsStreamingQueueRef.current = [];
          finished.value = true;
        },
      };
    },
    [accessToken, enqueueAudio],
  );

  // Ref so SSE consumer effects can grab the latest controller factory
  // without re-creating their effect on every render.
  const createStreamingTtsControllerRef = useRef(createStreamingTtsController);
  createStreamingTtsControllerRef.current = createStreamingTtsController;

  const speakText = useCallback(
    async (text: string) => {
      const responseText = (text || "").trim();
      if (!responseText) return;
      const sentences = responseText
        .replace(/([.!?;:])\s+/g, "$1\n")
        .split("\n")
        .map((s: string) => s.replace(/[*#_`~[\]]/g, "").trim())
        .filter((s: string) => s.length >= 3);
      if (sentences.length === 0) return;

      const controller = new AbortController();
      ttsAbortRef.current = controller;
      ttsCancelledRef.current = false;

      try {
        const { agentApi } = await import("@/lib/agentApi");
        let token = accessToken;
        if (!token) {
          try {
            const { getToken } = await import("@/lib/storage");
            token = (await getToken()) || "";
          } catch { /* ignore */ }
        }
        setHasAudio(true);
        // 2026-06-06: fire all sentence TTS requests in parallel, then await
        // their results in document order. Was sequential `for...await` —
        // each sentence's POST blocked the next, so TTS production rate was
        // capped at ~1 sentence per 2s (network round-trip). Audio playback
        // of one sentence (~4-6s) consistently outpaced production, draining
        // the queue and creating audible gaps mid-response. Concurrent firing
        // keeps the queue ahead of playback. All requests share `controller.signal`
        // so a single abort still cancels every in-flight call.
        //
        // 2026-06-11: retry-with-backoff on 5xx + network errors. The
        // backend /v1/agents/voice/synthesize endpoint calls OpenAI TTS
        // upstream; OpenAI returns 503 during load spikes (observed 50%
        // failure rate on staging-b 17:15-17:16 UTC for IP 104.54.73.13).
        // The previous code silently caught all errors as `null` and
        // dropped those sentences — exactly the symptom Bill saw: audio
        // pauses mid-response and audio starting mid-response with the
        // first 4 sentences silently dropped. 3 attempts at 0/500/1500ms
        // backoff masks the upstream flakiness for the user.
        const synthOnce = (sentence: string): Promise<ArrayBuffer | null> =>
          agentApi
            .post(
              "/v1/agents/voice/synthesize",
              { text: sentence.slice(0, 4096), voice: "shimmer" },
              {
                headers: token ? { "access-token": token } : {},
                responseType: "arraybuffer",
                timeout: 30000,
                signal: controller.signal,
              },
            )
            .then((r): ArrayBuffer | null =>
              r.data && r.data.byteLength > 0 ? r.data : null,
            );

        const synthWithRetry = async (
          sentence: string,
        ): Promise<ArrayBuffer | null> => {
          const backoffMs = [0, 500, 1500]; // 3 attempts total
          let lastErr: unknown = null;
          for (let attempt = 0; attempt < backoffMs.length; attempt++) {
            if (ttsCancelledRef.current || controller.signal.aborted) return null;
            if (attempt > 0) {
              await new Promise((r) => setTimeout(r, backoffMs[attempt]));
            }
            try {
              return await synthOnce(sentence);
            } catch (err) {
              lastErr = err;
              const code = (err as { code?: string })?.code;
              // Abort fired by user / page nav — don't retry.
              if (code === "ERR_CANCELED" || controller.signal.aborted) return null;
              // 4xx (auth / validation) won't recover; bail immediately.
              const status = (err as { response?: { status?: number } })?.response?.status;
              if (typeof status === "number" && status >= 400 && status < 500) {
                console.warn("[MeridianChat] TTS 4xx — not retrying:", status, err);
                return null;
              }
              // 5xx + network errors — fall through to next attempt.
            }
          }
          console.warn(
            "[MeridianChat] TTS dropped after 3 attempts; sentence will be silent:",
            { sentence: sentence.slice(0, 80), err: lastErr },
          );
          return null;
        };

        const ttsPromises = sentences.map((sentence) => synthWithRetry(sentence));
        for (const promise of ttsPromises) {
          if (ttsCancelledRef.current) break;
          const audio = await promise;
          if (ttsCancelledRef.current) break;
          if (audio) enqueueAudio(audio);
        }
      } finally {
        if (ttsAbortRef.current === controller) ttsAbortRef.current = null;
      }
    },
    [accessToken, enqueueAudio],
  );

  const handleCancelStream = useCallback(() => {
    ttsCancelledRef.current = true;
    try { ttsAbortRef.current?.abort(); } catch { /* ignore */ }
    ttsAbortRef.current = null;
    // T22 streaming TTS — cancel the in-flight per-sentence pipeline so
    // Cancel button stops audio + aborts pending OpenAI TTS POSTs in
    // one action. Mirrors `speakText`'s abort behavior.
    try { sseTtsControllerRef.current?.cancel(); } catch { /* ignore */ }
    sseTtsControllerRef.current = null;
    stopAudio();
  }, [stopAudio]);

  // Refs so handleJobSettled (created BEFORE speakText/voiceEnabled below)
  // can read the latest values without re-creating itself on every change.
  // Re-creating would re-init useMeridianJob and reset its WS push handler.
  const speakTextRef = useRef(speakText);
  speakTextRef.current = speakText;
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const onAudioData = useCallback(
    (audioData: ArrayBuffer) => {
      // Route to the streaming audio queue for sentence-level playback.
      if (audioData.byteLength > 0) {
        wsHasAudioRef.current = true;
        enqueueAudio(audioData);
        setHasAudio(true);
        // Also feed DemoAudioService for waveform visualization
        const svc = demoAudioServiceRef.current;
        if (svc) {
          svc.initializeAudioContext().then(() => {
            svc.addAudioChunk(audioData, false);
            scheduleAudioBufferRefresh();
          });
        }
      }
    },
    [enqueueAudio, scheduleAudioBufferRefresh],
  );

  // -------------------------------------------------------------------
  // Meridian WebSocket
  // -------------------------------------------------------------------

  const {
    connect: wsConnect,
    disconnect,
    sendMessage: _wsSendMessage,
    isConnected: _isConnected,
    isConnecting,
    isProcessing,
    currentAgent,
    currentDomain,
    reconnectExhausted: _wsReconnectExhausted,
  } = useMeridianWebSocket({ onResponse, onAudioData });

  // Expose wsSendMessage to the connected-frame flush logic in onResponse
  // (onResponse is defined above the hook call, so it can't close over
  // _wsSendMessage directly — the ref bridges that).
  useEffect(() => {
    wsSendMessageRef.current = _wsSendMessage;
  }, [_wsSendMessage]);

  // -------------------------------------------------------------------
  // T22 — SSE WS-failure fallback for text chat
  // -------------------------------------------------------------------
  //
  // When the WS reconnect loop has exhausted its budget, the existing
  // text-send path (POST /v1/agents/chat/async + WS push) collapses to
  // 2-second-per-poll progress with no token streaming. The SSE
  // endpoint /v1/agents/chat/stream gives token-by-token UX in that
  // failure window. When SSE is unavailable (server flag OFF returns
  // 404 STREAMING_DISABLED) or the server's preflight redirects
  // multi-agent DAGs to async-jobs, we fall through to the existing
  // meridianJob flow. The happy WS path (_wsReconnectExhausted === false)
  // is untouched — this is purely a degraded-mode improvement.
  const sseStreamingMessageIdRef = useRef<string | null>(null);
  // Streaming-TTS controller for the in-flight SSE response, if voice
  // is enabled + flag is on. Created on the first `onToken` callback,
  // finished/torn down on `onComplete`/`onError`/cancel.
  const sseTtsControllerRef = useRef<ReturnType<
    typeof createStreamingTtsController
  > | null>(null);
  const sseStream = useMeridianSSEStream({
    onToken: (tok: string) => {
      // T22 streaming voice: drive per-sentence TTS in lockstep with
      // SSE tokens, gated on the client flag + voice-enabled state. If
      // either is off, controller is null and we no-op — `speakText` is
      // still invoked at completion time by the legacy path.
      if (!voiceEnabledRef.current) return;
      if (!sseTtsControllerRef.current) {
        sseTtsControllerRef.current =
          createStreamingTtsControllerRef.current?.("shimmer") ?? null;
      }
      sseTtsControllerRef.current?.push(tok);
    },
    onComplete: () => {
      sseTtsControllerRef.current?.finish();
      sseTtsControllerRef.current = null;
    },
    onError: () => {
      sseTtsControllerRef.current?.cancel();
      sseTtsControllerRef.current = null;
    },
  });
  const _sseStreamingText = sseStream.streamingText;
  const _sseLastComplete = sseStream.lastComplete;
  // Mirror streaming tokens into the placeholder bubble while in flight.
  useEffect(() => {
    const placeholderId = sseStreamingMessageIdRef.current;
    if (!placeholderId || !_sseStreamingText) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === placeholderId
          ? { ...m, kind: "text" as const, isProcessing: false, text: _sseStreamingText }
          : m,
      ),
    );
  }, [_sseStreamingText]);
  // Finalize the placeholder once the complete frame arrives.
  useEffect(() => {
    if (!_sseLastComplete) return;
    const placeholderId = sseStreamingMessageIdRef.current;
    if (!placeholderId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === placeholderId
          ? {
              ...m,
              kind: "text" as const,
              isProcessing: false,
              text: _sseLastComplete.content,
            }
          : m,
      ),
    );
    sseStreamingMessageIdRef.current = null;
  }, [_sseLastComplete]);

  // Keep attribution in sync with WS-reported agent
  useEffect(() => {
    if (currentAgent) setAgentAttribution(currentAgent);
  }, [currentAgent]);

  // Persist last multi-agent collaboration to sessionStorage so the
  // Dashboard banner can hydrate it on next render. Clears on tab close.
  useEffect(() => {
    if (lastCollaboration) {
      try {
        sessionStorage.setItem(
          "last_collaboration",
          JSON.stringify(lastCollaboration),
        );
      } catch {
        // ignore
      }
    }
  }, [lastCollaboration]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Conversations
  const { data: conversationData, isLoading: isLoadingConversations, isError: isConversationsError } = useAgentConversation(
    AGENT_ID,
    { page: 1, limit: 100, search: debouncedSearch },
  );
  const queryClient = useQueryClient();
  const {
    data: messagesPages,
    isLoading: isLoadingConversation,
    hasNextPage: hasMoreMessages,
    isFetchingNextPage: isFetchingMore,
    fetchNextPage,
  } = useConversationMessagesInfinite(conversationId, 50);

  const createConvMutation = useCreateConversation();
  const deleteConvMutation = useDeleteConversation();
  const renameConvMutation = useRenameConversation();

  type ConversationListResponse =
    | { data?: { conversations?: Array<{ id: string; title?: string }>; page?: number; total_count?: number } }
    | undefined;
  const convResp = (conversationData as ConversationListResponse) || undefined;
  const hasConversations = Boolean(
    convResp?.data?.conversations && convResp.data.conversations.length > 0,
  );

  // -------------------------------------------------------------------
  // Conversation actions
  // -------------------------------------------------------------------

  const handleToggleDocSelect = useCallback(async (id: string) => {
    await disconnect();
    setSelectedFileIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, [disconnect]);

  const handleCreateConversation = useCallback(() => {
    if (!AGENT_ID || createConvMutation.isPending) return;
    createConvMutation.mutate(
      { agentId: AGENT_ID },
      {
        onSuccess: async (resp) => {
          queryClient.invalidateQueries({
            queryKey: ["agent", "conversation", AGENT_ID],
            exact: false,
          });
          const id = extractSessionId(resp);
          if (id) {
            await secureRemoveItem("conv");
            setSelectedId(id);
            setConversationId(id);
            await secureSetItem("conv", { id });
            setAudioPlayerBuffer(null);
            wsConnect(accessToken);
          }
        },
        onError: (e) => {
          console.error("Failed to create conversation", e);
        },
      },
    );
  }, [accessToken, wsConnect, createConvMutation, queryClient]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      if (deleteConvMutation.isPending) return;
      const deletingActive = id === conversationId || id === selectedId;
      try {
        await deleteConvMutation.mutateAsync({ conversationId: id, agentId: AGENT_ID });
        if (deletingActive) {
          await disconnect();
          demoAudioServiceRef.current?.resetAudioState();
          setHasAudio(false);
          setIsAudioPaused(false);
          setMessages([]);
          setAudioPlayerBuffer(null);
          setConversationId(undefined);
          setSelectedId(undefined);
          try {
            await secureRemoveItem("conv");
          } catch {
            // ignore
          }
          handleCreateConversation();
        }
      } catch (e) {
        console.error("Failed to delete conversation", e);
      }
    },
    [conversationId, deleteConvMutation, disconnect, handleCreateConversation, selectedId],
  );

  const handleRenameConversation = useCallback(
    async (id: string, title: string) => {
      if (renameConvMutation.isPending) return;
      try {
        await renameConvMutation.mutateAsync({ conversationId: id, title, agentId: AGENT_ID });
      } catch (e) {
        console.error("Failed to rename conversation", e);
      }
    },
    [renameConvMutation],
  );

  // WS connection is optional — REST is the primary chat path.
  // Attempt WS connect for potential future streaming, but don't block on it.
  useEffect(() => {
    if (!accessToken) return;
    const timer = setTimeout(() => wsConnect(accessToken), 1000);
    return () => {
      clearTimeout(timer);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Hydrate conversation on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await secureGetItem<{ id?: string }>("conv");
      if (!mounted) return;
      if (stored?.id) {
        setConversationId(stored.id);
        setSelectedId(stored.id);
        return;
      }
      if (!createConvMutation.isPending && !stored?.id) {
        createConvMutation.mutate(
          { agentId: AGENT_ID },
          {
            onSuccess: async (resp: unknown) => {
              queryClient.invalidateQueries({
                queryKey: ["agent", "conversation", AGENT_ID],
                exact: false,
              });
              const id = extractSessionId(resp);
              if (id) {
                await secureRemoveItem("conv");
                setSelectedId(id);
                setConversationId(id);
                secureSetItem("conv", { id });
              }
            },
            onError: (e) => {
              console.error("Failed to auto-create conversation", e);
            },
          },
        );
      }
    })();
    return () => {
      mounted = false;
      demoAudioServiceRef.current?.resetAudioState();
      setIsAudioPaused(true);
    };
  }, []);

  // Hydrate messages from API when switching conversations
  useEffect(() => {
    if (!messagesPages) return;
    const pages = Array.isArray((messagesPages as { pages?: unknown[] }).pages)
      ? (messagesPages as { pages: Array<{ data?: { messages?: Array<Record<string, unknown>> } }> }).pages
      : [];
    const rawMsgs = pages.flatMap((p) =>
      Array.isArray(p.data?.messages) ? p.data!.messages! : [],
    );
    const mapped: ChatMessage[] = rawMsgs.map((m, idx) => {
      const id = typeof m.id === "string" ? (m.id as string) : `m-${Date.now()}-${idx}`;
      const role = typeof m.message_type === "string" ? (m.message_type as string) : "";
      const sender: "assistant" | "user" = role.toLowerCase() === "assistant" ? "assistant" : "user";
      const created = m.sent_at ?? m.created_at ?? m.timestamp;
      const time = formatUSTimeSafe(created);
      const text =
        typeof m.content === "string"
          ? (m.content as string)
          : typeof m.text === "string"
            ? (m.text as string)
            : "";
      return { id, kind: "text", sender, text, time };
    });
    setMessages(mapped);
  }, [messagesPages]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      if (selectedId === id) return;
      await disconnect();
      demoAudioServiceRef.current?.resetAudioState();
      setIsAudioPaused(true);
      setSelectedId(id);
      setConversationId(id);
      setSearchQuery("");
      setMessages([]);
      setAudioPlayerBuffer(null);
      setAgentAttribution(null);
      secureSetItem("conv", { id });
    },
    [disconnect, selectedId],
  );

  // Build history groups
  const groups: HistoryGroup[] = useMemo(() => {
    const convs =
      (
        conversationData as {
          data?: { conversations?: Array<{ id: string; title?: string; created_at?: string }> };
        }
      )?.data?.conversations ?? [];
    const items = convs.map((c) => ({
      id: c.id,
      title: c.title || "No Title",
      preview: "To do",
      timeLabel: c.created_at ? formatUSTimeSafe(c.created_at) : "",
    }));
    return [{ label: "Conversations", items }];
  }, [conversationData]);

  const handleExportChat = useCallback(
    async (from: Date, to: Date) => {
      if (!conversationId) return;
      try {
        const resp = (await exportConversation(conversationId, from, to)) as {
          status?: boolean;
          data?: {
            file_name?: string;
            mime_type?: string;
            base64_pdf?: string;
            base64_csv?: string;
          };
          file_name?: string;
          mime_type?: string;
          base64_pdf?: string;
          base64_csv?: string;
        };
        if (!resp || !resp.status) {
          toast.error("Couldn't export chat — the backend returned no data.");
          return;
        }
        const payload = resp.data ?? resp;
        const base64 = payload.base64_pdf || payload.base64_csv;
        const mime = payload.mime_type || "application/pdf";
        const fileName = payload.file_name || `conversation_${conversationId}.pdf`;
        if (!base64) {
          toast.error("Couldn't export chat — no content in the selected range.");
          return;
        }
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Failed to export conversation", e);
        toast.error("Couldn't export chat — please try again.");
      }
    },
    [conversationId],
  );

  // ── Page-refresh hydration: in-flight async-jobs ────────────────
  //
  // When the user reloads the page (or switches tabs and returns) we
  // want any chat_jobs still in `queued`/`running` for this session to
  // re-appear as in-flight bubbles. The hook resumes polling on its
  // own once we hand it the session id; we just need to render the
  // placeholder bubble + the original user message so the UX is
  // continuous.
  const hydratedSessionRef = useRef<string | null>(null);
  useEffect(() => {
    const sid = conversationId || "default";
    if (hydratedSessionRef.current === sid) return;
    hydratedSessionRef.current = sid;

    void (async () => {
      try {
        const active = await meridianJob.listActiveJobs(sid);
        if (active.length === 0) return;
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.kind !== "processing");
          const time = formatUSTimeSafe(new Date());
          const additions: ChatMessage[] = [];
          for (const job of active) {
            additions.push({
              id: `msg-${job.job_id}-user`,
              kind: "text" as const,
              sender: "user" as const,
              text: job.message,
              time,
            });
            additions.push({
              id: `msg-${job.job_id}-pending`,
              kind: "processing" as const,
              sender: "assistant" as const,
              time,
              isProcessing: true,
              type: "processing",
              text: "Meridian is thinking...",
            });
          }
          return [...filtered, ...additions];
        });
      } catch {
        // Hydration is best-effort — if listActiveJobs fails (network
        // hiccup, backend not yet deployed) we silently skip. The user
        // can still send a new message; in-flight ones simply won't
        // surface until they happen to land.
      }
    })();
  }, [conversationId, meridianJob]);

  // Cleanup audio buffer timer
  useEffect(() => {
    return () => {
      if (audioBufferUpdateTimeoutRef.current) {
        clearTimeout(audioBufferUpdateTimeoutRef.current);
        audioBufferUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <UserLayout>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Meridian</h1>
        {agentAttribution && agentAttribution !== "meridian" && (
          <span className="text-xs text-muted-foreground">via {agentAttribution}</span>
        )}
        {currentDomain && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {currentDomain}
          </span>
        )}
        {isProcessing && (
          <span className="text-xs italic text-muted-foreground">Meridian is thinking...</span>
        )}

        {/* Session-level multi-agent collaboration indicator */}
        {lastCollaboration && (
          <MultiAgentIndicator
            contributingAgents={lastCollaboration.contributingAgents}
            synthesized={lastCollaboration.synthesized}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Voice toggle */}
        <button
          type="button"
          title={voiceEnabled ? "Voice responses ON — click to mute" : "Voice responses OFF — click to enable"}
          className={`p-1.5 rounded-md transition-colors ${voiceEnabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"}`}
          onClick={() => {
            const next = !voiceEnabled;
            setVoiceEnabled(next);
            try { localStorage.setItem("meridian_voice", String(next)); } catch { /* */ }
            if (!next) stopAudio();
          }}
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        {/* Autoplay-blocked banner — appears when the browser refused
            to play the first audio chunk because no user gesture had
            been recorded yet. One click on the button fires unlock(),
            which clears the flag and retries the queue. */}
        {isAudioAutoplayBlocked && voiceEnabled && (
          <button
            type="button"
            title="Browser blocked audio playback — click to enable"
            className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100 transition-colors"
            onClick={() => unlockAudio()}
          >
            <Volume2 className="h-3.5 w-3.5" />
            Enable audio
          </button>
        )}

        {/* Audio transport controls — visible when audio is playing or queued */}
        {(isAudioPlaying || audioQueueLength > 0) && (
          <div className="flex items-center gap-1 rounded-lg border bg-background px-2 py-1 shadow-sm">
            {/* Rewind 5s within current sentence */}
            <button
              type="button"
              title="Rewind 5 seconds"
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={() => seekAudio(-5)}
            >
              <Rewind className="h-3.5 w-3.5" />
            </button>
            {/* Pause / Resume */}
            <button
              type="button"
              title={isAudioQueuePaused ? "Resume audio" : "Pause audio"}
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={() => isAudioQueuePaused ? resumeAudio() : pauseAudio()}
            >
              {isAudioQueuePaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            {/* Fast-forward 5s within current sentence */}
            <button
              type="button"
              title="Fast-forward 5 seconds"
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={() => seekAudio(5)}
            >
              <FastForward className="h-3.5 w-3.5" />
            </button>
            {/* Skip to next sentence */}
            <button
              type="button"
              title="Skip to next sentence"
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={skipAudio}
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            {/* Cancel — stop playback AND abort in-flight TTS stream */}
            <button
              type="button"
              title="Cancel stream"
              className="p-1 rounded hover:bg-muted transition-colors text-destructive"
              onClick={handleCancelStream}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {audioQueueLength > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1">{audioQueueLength} queued</span>
            )}
          </div>
        )}

        {/* Connection status indicator */}
        <div
          title={
            _isConnected
              ? "Voice streaming available"
              : isConnecting
                ? "Connecting voice stream..."
                : "Voice streaming unavailable"
          }
          className="flex items-center gap-1"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
          ) : _isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {_isConnected ? "Voice ready" : isConnecting ? "Connecting" : "Voice off"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 h-full" data-tour="chat-history">
          <ChatHistory
            groups={groups}
            selectedId={selectedId}
            onSelect={handleSelectConversation}
            className="h-full"
            hasConversations={hasConversations}
            onCreateNewConversation={handleCreateConversation}
            isLoading={isLoadingConversations || createConvMutation.isPending}
            isError={isConversationsError}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            isAudioRunning={hasAudio && !isAudioPaused}
            audioWarningText="Switching conversations will reset audio for the new conversation."
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            renameIsPending={renameConvMutation.isPending}
          />
        </div>
        <div className="lg:col-span-8" data-tour="chat-window">
          <ChatWindow
            coachName={COACH_NAME}
            coachId={AGENT_ID}
            conversationId={conversationId}
            onBack={() => navigate(-1)}
            onSendText={(t) => {
              demoAudioServiceRef.current?.resetAudioState();
              setHasAudio(false);
              setIsAudioPaused(false);
              setAgentAttribution(null);
              stopAudio(); // Clear any previous audio queue
              const timeStr = formatUSTimeSafe(new Date());
              setMessages((prev) => [
                ...prev.filter((m) => m.kind !== "processing"),
                {
                  id: `msg-${Date.now()}-user`,
                  kind: "text",
                  sender: "user",
                  text: t,
                  time: timeStr,
                },
                {
                  id: `msg-${Date.now()}-assistant`,
                  kind: "processing",
                  sender: "assistant",
                  time: timeStr,
                  isProcessing: true,
                  type: "processing",
                  text: "Meridian is thinking...",
                },
              ]);
              // Route text chat through the async-jobs path. POST
              // /v1/agents/chat/async returns a job_id immediately and
              // runs meridian.respond() in the background — sidestepping
              // API GW HTTP API's 30s integration cap that killed
              // multi-agent DAG responses. Completion arrives via the
              // WS `job_complete` push frame (when the socket is open)
              // or by polling GET /v1/agents/chat/jobs/{job_id}.
              //
              // The placeholder bubble is replaced inside
              // handleJobSettled → renderAssistantComplete via the
              // shared rendering path.
              const sessionForJob = conversationId || "default";

              // T22 — SSE fallback branch. Fires only when the WS
              // reconnect budget is fully exhausted; the happy path
              // (next clause) is unchanged. On the SSE path the
              // assistant placeholder is the streaming bubble itself.
              if (_wsReconnectExhausted) {
                const placeholderId = `msg-${Date.now()}-assistant`;
                // Re-tag the placeholder (which was inserted above with
                // the same Date.now() in the same tick) so the SSE
                // effects above can target it. We patch the LAST
                // processing bubble belonging to the assistant.
                setMessages((prev) => {
                  const idx = [...prev].reverse().findIndex(
                    (m) => m.sender === "assistant" && m.kind === "processing",
                  );
                  if (idx === -1) return prev;
                  const realIdx = prev.length - 1 - idx;
                  const copy = prev.slice();
                  copy[realIdx] = { ...copy[realIdx], id: placeholderId };
                  return copy;
                });
                sseStreamingMessageIdRef.current = placeholderId;
                void sseStream
                  .send({
                    message: t,
                    sessionId: sessionForJob,
                    context: { conversation_id: conversationId, session_id: sessionForJob },
                    fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
                  })
                  .catch((err: unknown) => {
                    // Preflight option C — the server redirected us to
                    // the async-jobs path. Hand off to the existing
                    // meridianJob flow so polling + final render goes
                    // through the canonical settlement code.
                    if (err instanceof PreflightAsyncRedirectError) {
                      sseStreamingMessageIdRef.current = null;
                      void meridianJob
                        .startJob({
                          message: t,
                          sessionId: sessionForJob,
                          fileIds:
                            selectedFileIds.length > 0 ? selectedFileIds : undefined,
                          context: {
                            conversation_id: conversationId,
                            session_id: sessionForJob,
                            preflight_redirect_job_id: err.redirect.jobId,
                          },
                        })
                        .catch(() => {
                          setStatusBanner({ type: "error", text: "Couldn't reach Meridian" });
                        });
                    }
                    // All other errors — including STREAMING_DISABLED
                    // — already surface via sseStream.lastError; let the
                    // UI render the error frame text on the placeholder
                    // rather than swallowing it here.
                  });
              } else {
                void meridianJob
                  .startJob({
                    message: t,
                    sessionId: sessionForJob,
                    fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
                    context: { conversation_id: conversationId, session_id: sessionForJob },
                  })
                  .catch(() => {
                    setStatusBanner({ type: "error", text: "Couldn't reach Meridian" });
                    setMessages((prev) => [
                      ...prev.filter((m) => m.kind !== "processing"),
                      {
                        id: `msg-${Date.now()}-err`,
                        kind: "text" as const,
                        sender: "assistant" as const,
                        text: "Sorry, I couldn't reach Meridian. Please try again.",
                        time: formatUSTimeSafe(new Date()),
                      },
                    ]);
                  });
              }
              // Keep the WS open in the background so push frames land
              // when the job settles. The socket is not required for
              // correctness (polling is the fallback), but it removes
              // the poll-cycle wait when the user is still on the page.
              if (!_isConnected && accessToken) wsConnect(accessToken);
            }}
            onToggleRecording={() => {
              if (voiceRecording) {
                // Stop recording — SpeechRecognition will fire onend/onresult
                recognitionRef.current?.stop();
                setVoiceRecording(false);
                return;
              }
              // Start browser-based speech recognition
              const SpeechRec = (window as unknown as Record<string, unknown>).SpeechRecognition
                || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
              if (!SpeechRec) {
                setStatusBanner({ type: "error", text: "Voice input not supported in this browser" });
                return;
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rec = new (SpeechRec as any)();
              rec.continuous = true;
              rec.interimResults = false;
              rec.lang = "en-US";
              voiceTranscriptRef.current = "";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              rec.onresult = (e: any) => {
                let text = "";
                for (let i = 0; i < e.results.length; i++) {
                  if (e.results[i].isFinal) text += e.results[i][0].transcript + " ";
                }
                voiceTranscriptRef.current = text.trim();
              };
              rec.onend = () => {
                setVoiceRecording(false);
                const transcript = voiceTranscriptRef.current.trim();
                if (!transcript) return;

                const timeStr = formatUSTimeSafe(new Date());
                stopAudio(); // Clear any previous audio queue
                setMessages((prev) => [
                  ...prev.filter((m) => m.kind !== "processing"),
                  { id: `msg-${Date.now()}-user`, kind: "text", sender: "user", text: transcript, time: timeStr },
                  { id: `msg-${Date.now()}-assistant`, kind: "processing", sender: "assistant", time: timeStr, isProcessing: true, type: "processing", text: "Meridian is thinking..." },
                ]);

                // D1-A (2026-05-30, PR α from #316): when voice is enabled
                // AND the Meridian WS is open, this branch USED to send the
                // transcript through the socket with {voice: true} so the
                // backend could stream text tokens + per-sentence base64
                // MP3 audio frames.
                //
                // Disabled 2026-06-09 (#127): the WS-voice fast path depends
                // on a dedicated `ig-{env}-ws-forwarder` Lambda invoked from
                // ws-proxy/handler.py:491. That Lambda only exists on dev
                // (as `ig-dev-ws-forwarder`, manually created, not in CDK).
                // On staging-b the invoke fails and ws-proxy responds with
                // `{type: "error", message: "Failed to process message"}`,
                // surfacing as the same error message in the UI on every
                // voice send. The benefit of the WS path is also already
                // largely theoretical in production per
                // `feedback_ws_proxy_strips_voice_streaming` — ws-proxy
                // forwards chat to the REST endpoint that does not stream
                // audio frames over the socket.
                //
                // Always route voice through the REST async-jobs path
                // below until the ws-forwarder is brought under CDK
                // and deployed per-env. That path now has cold-start
                // retry (PR #126) and per-sentence speakText TTS.
                const wsReady = false;
                if (wsReady) {
                  // Kept as dead-code-style for the future re-enable PR
                  // once the ws-forwarder gap is closed. The body is
                  // intentionally unreachable.
                }

                // ── REST async-jobs path (canonical) ──
                (async () => {
                  try {
                    const { agentApi } = await import("@/lib/agentApi");
                    let token = accessToken;
                    if (!token) {
                      try { const { getToken } = await import("@/lib/storage"); token = (await getToken()) || ""; } catch { /* */ }
                    }
                    const headers = token ? { "access-token": token } : {};

                    // Cold-start retry on /v1/agents/chat/async — same shape
                    // as useMeridianJob.startJob (see useMeridianJob.ts
                    // :111-120). API GW HTTP API caps the acceptance call
                    // at 30s; the first question after a quiet period often
                    // hits a cold ECS task that can't accept inside that
                    // window and returns 503. Retrying on 5xx + network
                    // errors with a short backoff catches the cold-start
                    // case on attempt #2. Without this, the very first
                    // voice question after a quiet period shows "Sorry, I
                    // couldn't reach Meridian" — the text-input path
                    // already has this retry; voice was a single-shot
                    // copy that pre-dated the fix on the text path.
                    const startAttempts = 3;
                    const startBackoffMs = [0, 3000, 6000];
                    const isRetriableStart = (err: unknown): boolean => {
                      if (!err || typeof err !== "object") return false;
                      const e = err as { response?: { status?: unknown }; code?: unknown };
                      const status = e.response?.status;
                      if (typeof status === "number") return status >= 500 && status < 600;
                      return e.code === "ECONNABORTED" || e.code === "ERR_NETWORK";
                    };
                    let startResp: { data?: { job_id?: string } } | null = null;
                    let lastStartErr: unknown = null;
                    for (let attempt = 0; attempt < startAttempts; attempt++) {
                      if (attempt > 0) await new Promise((r) => setTimeout(r, startBackoffMs[attempt]));
                      try {
                        startResp = await agentApi.post(
                          "/v1/agents/chat/async",
                          {
                            message: transcript,
                            session_id: conversationId || "default",
                            ...(selectedFileIds.length > 0 ? { file_ids: selectedFileIds } : {}),
                          },
                          { headers, timeout: 15000 },
                        );
                        lastStartErr = null;
                        break;
                      } catch (err) {
                        lastStartErr = err;
                        if (!isRetriableStart(err)) throw err;
                        // Retry on 5xx / network. Final attempt falls
                        // through to the throw below.
                      }
                    }
                    if (!startResp) throw lastStartErr ?? new Error("voice chat: chat/async failed");
                    const jobId: string | undefined = startResp.data?.job_id;
                    if (!jobId) throw new Error("voice chat: chat/async returned no job_id");

                    // Poll the job until terminal. 2s cadence matches
                    // useMeridianJob; 5min ceiling protects against runaway.
                    const pollIntervalMs = 2000;
                    const pollTimeoutMs = 5 * 60_000;
                    const deadline = Date.now() + pollTimeoutMs;
                    type JobShape = { status?: string; content?: string | null; agent?: string | null; metadata?: { assistant_message_id?: string; rag_sources?: RAGSource[] }; error?: string | null };
                    let data: JobShape | null = null;
                    while (Date.now() < deadline) {
                      await new Promise((r) => setTimeout(r, pollIntervalMs));
                      // NO per-poll axios timeout. The agent-engine's
                      // /v1/agents/chat/jobs/{job_id} endpoint long-polls
                      // for up to ~18 sec waiting for the job to reach a
                      // terminal state. The previous explicit 15s timeout
                      // here was SHORTER than the server's long-poll
                      // window, causing axios to abort during the wait
                      // and surface "Sorry, I couldn't reach Meridian"
                      // even though the backend had finished the job
                      // (observed 2026-06-11 on staging-b for two 27-29s
                      // PRISM responses that completed cleanly on the
                      // backend but never returned to the client).
                      //
                      // Matches the text path's behavior in
                      // useMeridianJob.pollJob() (no per-request timeout)
                      // — the 5-minute overall ceiling above bounds the
                      // total wait.
                      const pollResp = await agentApi.get(
                        `/v1/agents/chat/jobs/${jobId}`,
                        { headers },
                      );
                      const job = pollResp.data as JobShape;
                      if (job?.status === "complete" || job?.status === "error") {
                        data = job;
                        break;
                      }
                    }
                    if (!data) throw new Error("voice chat: poll timeout (5 min)");
                    if (data.status === "error") {
                      throw new Error(data.error || "voice chat: job error");
                    }

                    const responseText = data?.content || "No response.";
                    const restAssistantIdVoice =
                      data?.metadata?.assistant_message_id ?? `msg-${Date.now()}-resp`;
                    setMessages((prev) => [
                      ...prev.filter((m) => m.kind !== "processing"),
                      { id: restAssistantIdVoice, kind: "text" as const, sender: "assistant" as const, text: responseText, time: formatUSTimeSafe(new Date()), agent: data?.agent ?? undefined, ragSources: data?.metadata?.rag_sources?.filter((s) => s.filename) },
                    ]);
                    if (data?.agent) setAgentAttribution(data.agent);

                    // ── Sentence-level TTS via REST ──────────────────
                    // Delegate to speakText so this path shares the same
                    // queue + abort behavior as per-message Replay. Guarded
                    // by voiceEnabled so the mute toggle takes effect here
                    // too (the WS path above is already gated on the same
                    // flag via wsReady).
                    if (voiceEnabled) {
                      try {
                        await speakText(responseText);
                      } catch (ttsErr) {
                        console.warn("[MeridianChat] TTS failed, falling back to browser:", ttsErr);
                        if ("speechSynthesis" in window) {
                          const utter = new SpeechSynthesisUtterance(responseText);
                          window.speechSynthesis.speak(utter);
                        }
                      }
                    }
                  } catch (err) {
                    console.error("[MeridianChat] Voice chat failed:", err);
                    setMessages((prev) => [
                      ...prev.filter((m) => m.kind !== "processing"),
                      { id: `msg-${Date.now()}-err`, kind: "text" as const, sender: "assistant" as const, text: "Sorry, I couldn't reach Meridian. Please try again.", time: formatUSTimeSafe(new Date()) },
                    ]);
                  }
                })();
              };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              rec.onerror = (e: any) => {
                console.error("[MeridianChat] Speech recognition error:", e.error);
                setVoiceRecording(false);
                if (e.error === "not-allowed") setStatusBanner({ type: "error", text: "Microphone access denied" });
              };
              recognitionRef.current = rec;
              rec.start();
              setVoiceRecording(true);
            }}
            isRecording={voiceRecording}
            hasAudio={hasAudio}
            isAudioPaused={isAudioPaused}
            isMuted={isMuted}
            onToggleMute={(next) => {
              setIsMuted(next);
            }}
            setMessages={setMessages}
            onExportChat={handleExportChat}
            onToggleAudioPlayback={() => {
              const svc = demoAudioServiceRef.current;
              const ctx = svc?.getAudioContext();
              if (!svc || !ctx) return;
              if (ctx.state === "running") {
                svc.pauseAudio();
                setIsAudioPaused(true);
              } else if (ctx.state === "suspended") {
                svc.resumeAudio();
                setIsAudioPaused(false);
              }
            }}
            messages={messages}
            audioPlayerBuffer={audioPlayerBuffer}
            onCloseAudioPlayer={() => setShowAudioPlayer(false)}
            setShowAudioPlayer={setShowAudioPlayer}
            showAudioPlayer={showAudioPlayer}
            isConnecting={isConnecting}
            statusBanner={statusBanner}
            convIsLoading={isLoadingConversation}
            hasMore={!!hasMoreMessages}
            onLoadMore={() => {
              if (hasMoreMessages && !isFetchingMore) fetchNextPage();
            }}
            convIsFetchingNext={isFetchingMore}
            selectedFileIds={selectedFileIds}
            selectedDocNames={selectedDocNames}
            docSections={docSections}
            docIsLoading={docsLoading}
            onToggleDocSelect={handleToggleDocSelect}
            docOnDelete={docOnDelete}
            docOnDownload={docOnDownload}
            onReplayMessage={speakText}
          />
        </div>
      </div>
    </UserLayout>
  );
}
