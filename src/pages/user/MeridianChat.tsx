import UserLayout from "@/layouts/UserLayout";
import ChatHistory from "@/components/user/chat/ChatHistory";
import ChatWindow from "@/components/user/chat/ChatWindow";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HistoryGroup, ChatMessage } from "@/types/chat";
import { useAuth } from "@/context/useAuth";
import { useAgentConversation } from "@/hooks/agents/useAgentConversation";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateConversation } from "@/hooks/agents/useCreateConversation";
import { useConversationMessagesInfinite } from "@/hooks/agents/useConversationMessagesInfinite";
import { useDeleteConversation } from "@/hooks/agents/useDeleteConversation";
import { useRenameConversation } from "@/hooks/agents/useRenameConversation";
import { useMeridianWebSocket } from "@/hooks/agents/useMeridianWebSocket";
import type { MeridianResponse } from "@/hooks/agents/useMeridianWebSocket";
import DemoAudioService from "@/services/demoAudioService";
import { secureGetItem, secureSetItem, secureRemoveItem } from "@/lib/secureStorage";
import { useListDocuments } from "@/hooks/documents/useListDocuments";
import { useDownloadDocument } from "@/hooks/documents/useDownloadDocument";
import { useDeleteDocument } from "@/hooks/documents/useDeleteDocument";
import { api } from "@/lib/axios";
import { exportConversation } from "@/services/agent/agentService";
// Agent engine toggle is handled internally by conversation hooks/services
import { format } from "date-fns";
import { Sparkles } from "lucide-react";

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

  // Agent attribution from WS
  const [agentAttribution, setAgentAttribution] = useState<string | null>(null);

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

  // Audio buffer refresh
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

  const onResponse = useCallback(
    (resp: MeridianResponse) => {
      if (resp.type === "connected") {
        setStatusBanner({ type: "success", text: "Connected to Meridian" });
        return;
      }

      if (resp.type === "error") {
        setStatusBanner({ type: "error", text: resp.message || "Agent error" });
        lastMessageRef.current = { type: "error", text: resp.message ?? "" };
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
        const text = resp.content ?? "";
        if (resp.agent) setAgentAttribution(resp.agent);
        if (text) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.kind !== "processing");
            const lastMsg = filtered[filtered.length - 1];
            if (lastMsg && lastMsg.sender === "assistant" && lastMsg.kind === "text") {
              return [...filtered.slice(0, -1), { ...lastMsg, text }];
            }
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
        }
        lastMessageRef.current = { type: "complete", text };
        return;
      }
    },
    [],
  );

  const onAudioData = useCallback(
    (audioData: ArrayBuffer) => {
      const svc = demoAudioServiceRef.current;
      if (!svc) return;
      svc.initializeAudioContext().then(() => {
        svc.addAudioChunk(audioData, false);
        setHasAudio(false);
        scheduleAudioBufferRefresh();
      });
    },
    [scheduleAudioBufferRefresh],
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
    isRecording,
    startRecording,
    stopRecording,
    currentAgent,
    currentDomain,
  } = useMeridianWebSocket({ onResponse, onAudioData });

  // Keep attribution in sync with WS-reported agent
  useEffect(() => {
    if (currentAgent) setAgentAttribution(currentAgent);
  }, [currentAgent]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Conversations
  const { data: conversationData, isLoading: isLoadingConversations } = useAgentConversation(
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

  // Connect WS once when we have a token.
  // Uses a ref flag to ensure we only connect once per mount.
  const wsConnectedOnce = useRef(false);
  const wsConnectRef = useRef(wsConnect);
  wsConnectRef.current = wsConnect;
  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;

  useEffect(() => {
    if (!accessToken || wsConnectedOnce.current) return;
    wsConnectedOnce.current = true;
    // Small delay to let the component finish initial render
    const timer = setTimeout(() => {
      wsConnectRef.current(accessToken);
    }, 500);
    return () => {
      clearTimeout(timer);
      disconnectRef.current();
      wsConnectedOnce.current = false;
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
        if (!resp || !resp.status) return;
        const payload = resp.data ?? resp;
        const base64 = payload.base64_pdf || payload.base64_csv;
        const mime = payload.mime_type || "application/pdf";
        const fileName = payload.file_name || `conversation_${conversationId}.pdf`;
        if (!base64) return;
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
      }
    },
    [conversationId],
  );

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
              // Always use REST — the WS proxy chain is unreliable.
              // WS streaming will be re-enabled once the proxy is stable.
              (async () => {
                try {
                  const { agentApi } = await import("@/lib/agentApi");
                  const resp = await agentApi.post("/v1/agents/chat", {
                    message: t,
                    session_id: conversationId || "default",
                  }, {
                    headers: { "access-token": accessToken },
                    timeout: 120000,
                  });
                  const data = resp.data;
                  const timeNow = formatUSTimeSafe(new Date());
                  setMessages((prev) => [
                    ...prev.filter((m) => m.kind !== "processing"),
                    {
                      id: `msg-${Date.now()}-resp`,
                      kind: "text" as const,
                      sender: "assistant" as const,
                      text: data?.content || data?.message || "No response received.",
                      time: timeNow,
                      agent: data?.agent,
                    },
                  ]);
                  if (data?.agent) setAgentAttribution(data.agent);
                } catch (err) {
                  console.error("Chat request failed:", err);
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
                }
              })();
            }}
            onToggleRecording={() => (isRecording ? stopRecording() : startRecording())}
            isRecording={isRecording}
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
          />
        </div>
      </div>
    </UserLayout>
  );
}
