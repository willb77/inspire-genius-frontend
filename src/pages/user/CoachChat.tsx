import UserLayout from "@/layouts/UserLayout";
import ChatHistory from "@/components/user/chat/ChatHistory";
import ChatWindow from "@/components/user/chat/ChatWindow";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { HistoryGroup, ChatMessage } from "@/types/chat";
import { useAuth } from "@/context/useAuth";
import { useAgentConversation } from "@/hooks/agents/useAgentConversation";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateConversation } from "@/hooks/agents/useCreateConversation";
import { useConversationMessagesInfinite } from "@/hooks/agents/useConversationMessagesInfinite";
import { usePrismAgentWebSocket } from "@/hooks/agents/usePrismAgentWebSocket";
import type { AgentResponse } from "@/hooks/agents/usePrismAgentWebSocket";
import DemoAudioService from "@/services/demoAudioService";
import { secureGetItem, secureSetItem, secureRemoveItem } from "@/lib/secureStorage";
import { useListDocuments } from "@/hooks/documents/useListDocuments";
import { useDownloadDocument } from "@/hooks/documents/useDownloadDocument";
import { useDeleteDocument } from "@/hooks/documents/useDeleteDocument";
import { api } from "@/lib/axios";
import { exportConversation } from "@/services/agent/agentService";
import { format } from "date-fns";

function titleCaseFromSlug(slug: string): string {
  if (!slug) return "Coach";
  return slug
    .split("-")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function CoachChat() {
  const { coach = "" } = useParams();
  const navigate = useNavigate();
  // Parse '/:coach' param shaped as '<id>--<name-slug>' (preferred). Fallback to '<id>-<name-slug>'.
  const { agentId, coachName } = useMemo(() => {
    const raw = String(coach || "");
    let id = raw;
    let nameSlug = "";
    if (raw.includes("--")) {
      const parts = raw.split("--");
      id = parts[0] || raw;
      nameSlug = parts.slice(1).join("--");
    } else {
      const [idPart, ...nameParts] = raw.split("-");
      id = idPart || raw;
      nameSlug = nameParts.join("-");
    }
    const name = titleCaseFromSlug(nameSlug);
    return { agentId: id, coachName: name || "Coach" };
  }, [coach]);
  const { user } = useAuth();
  const accessToken = user?.token ?? "";

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
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error" | "info"; text: string } | undefined>(undefined);
  const prevSelectedIdsRef = useRef<string[]>([]);
  const isRefreshed = useRef(false);
  // Documents API & derived state
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
      const joinUrl = (fileKey: string) => `${base.replace(/\/+$/, "")}/${String(fileKey || "").replace(/^\/+/, "")}`;
      const kindFromApi = (t?: string) => {
        const k = String(t || "").toLowerCase();
        if (k === "pdf") return "pdf" as const;
        if (k === "csv") return "csv" as const;
        if (k === "ppt" || k === "pptx") return "ppt" as const;
        return "doc" as const;
      };
      return apiGroups
        .map((g) => {
          const items = (g.files || []).map((f: ApiFile) => ({
            id: f.id,
            name: f.filename,
            kind: kindFromApi(f.file_type),
            url: joinUrl(f.file_key),
            tempUrl: f.temp_url,
          }));
          return { title: g.date_label || g.date, items };
        })
        .filter((sec) => sec.items.length > 0);
    }
    return [] as Array<{ title: string; items: Array<{ id: string; name: string; kind: "pdf"|"csv"|"ppt"|"doc"; url?: string; tempUrl?: string }> }>;
  }, [fileServiceList]);

  const selectedDocNames = useMemo(() => {
    if (!selectedFileIds.length) return [] as string[];
    const flat = docSections.flatMap((s) => s.items);
    const map = new Map(flat.map((d) => [d.id, d.name] as const));
    return selectedFileIds.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [docSections, selectedFileIds]);

 

  const docOnDelete = useCallback(async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setSelectedFileIds((prev) => prev.filter((x) => x !== id));
    } catch {
      // swallow
    }
  }, [deleteMutation]);

  const docOnDownload = useCallback(async (id: string) => {
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
  }, [downloadMutation]);

  function formatUSTimeSafe(input: unknown): string {
    try {
      let d: Date;
      if (input instanceof Date) {
        d = input;
      } else if (typeof input === "string" || typeof input === "number") {
        d = new Date(input);
      } else {
        d = new Date();
      }
      return isNaN(d.getTime()) ? format(new Date(), "do MMM yy, hh:mm a") : format(d, "do MMM yy, hh:mm a");
    } catch {
      return format(new Date(), "do MMM yy, hh:mm a");
    }
  }

  const onResponse = useCallback((resp: AgentResponse) => {

    if (resp.type === "init_success") {
      setStatusBanner({ type: "success", text: "Connected. Select Documents to proceed" });
      return;
    }
    if (resp.type === "auth_error") {
      setStatusBanner({ type: "error", text: resp.message || "Authentication error" });
      return;
    }
    if (resp.type === "continuous_mode") {
      // Show processing placeholder (recording started)
      setMessages((prev) => ([
        ...prev.filter((m) => m.kind !== 'processing'),
        { id: `msg-${Date.now()}`, kind: 'processing', sender: 'assistant', time: formatUSTimeSafe(new Date()), isProcessing: true, type: 'processing' }
      ]));
      return;
    }
    if (resp.type === "audio_start") {
      demoAudioServiceRef.current?.resetAudioState();
      setHasAudio(true);
      setIsAudioPaused(false);
      return;
    }
    if (resp.type === "transcript") {
      const text = resp.text ?? "";
      if (!text) return;
      setMessages((prev) => ([...prev, { id: `msg-${Date.now()}`, kind: "text", sender: "user", text, time: formatUSTimeSafe(new Date()) }]));
      lastMessageRef.current = { type: "transcript", text };
      return;
    }
    if (resp.type === "response_chunk") {
      const text = resp.full_text ?? resp.text ?? "";
      if (!text) return;
      if (lastMessageRef.current.type !== "response_chunk" || lastMessageRef.current.text !== text) {
        setMessages((prev) => ([
          ...prev.filter((m) => m.kind !== 'processing'),
          { id: `msg-${Date.now()}`, kind: "text", sender: "assistant", text, time: formatUSTimeSafe(new Date()) }
        ]));
        lastMessageRef.current = { type: "response_chunk", text };
      }
      return;
    }
    if (resp.type === "response") {
      const text = resp.text ?? "";
      if (!text) return;
      lastMessageRef.current = { type: "response", text };
      return;
    }
    if (resp.type === "error") {
      const text = resp.message ?? "Unknown error";
      setStatusBanner({ type: "error", text });
      lastMessageRef.current = { type: "error", text };
      return;
    }
  }, []);

  const onAudioData = useCallback((audioData: ArrayBuffer) => {
    const svc = demoAudioServiceRef.current;
    if (!svc) return;
    svc.initializeAudioContext().then(() => {
      svc.addAudioChunk(audioData);
      setHasAudio(true);
      // const ctx = svc.getAudioContext();
      // if (ctx && ctx.state === "suspended" && !isAudioPaused) {
      //   svc.resumeAudio();
      //   setIsAudioPaused(false);
      // }
    });
  }, [isAudioPaused]);

  const {
    connect,
    disconnect,
    updateSelectedFiles,
    sendTextMessage,
    isConnected,
    isConnecting,
    isRecording,
    startRecording,
    stopRecording,
    updateContinuousMute,
  } = usePrismAgentWebSocket(onResponse, onAudioData);

  // Fetch agent conversation (temporary console.log for now)
  const { data: conversationData, isLoading: isLoadingConversations } = useAgentConversation(agentId, { page: 1, limit: 20 });
  const queryClient = useQueryClient();
  const {
    data: messagesPages,
    isLoading: isLoadingConversation,
    hasNextPage: hasMoreMessages,
    isFetchingNextPage: isFetchingMore,
    fetchNextPage,
  } = useConversationMessagesInfinite(conversationId, 50);

  const createConvMutation = useCreateConversation();
  type ConversationListResponse = { data?: { conversations?: Array<{ id: string; title?: string }>; page?: number; total_count?: number } } | undefined;
  const convResp = (conversationData as ConversationListResponse) || undefined;
  const hasConversations = Boolean(convResp?.data?.conversations && convResp.data.conversations.length > 0);
  function extractSessionId(resp: unknown): string | undefined {
    // Try common shapes: { data: { conversation: { id } } }, { data: { session: { id } } }, { data: { id } }, or flat
    try {
      if (!resp || typeof resp !== "object") return undefined;
      const r = resp as Record<string, unknown>;
      const data = (r.data ?? r) as Record<string, unknown>;
      const convo = data.conversation as Record<string, unknown> | undefined;
      const session = data.session as Record<string, unknown> | undefined;
      const fromConvo = typeof convo?.id === "string" ? (convo.id as string) : undefined;
      const fromSessionId = typeof session?.id === "string" ? (session.id as string) : undefined;
      const fromSessionConv = typeof session?.conversation_id === "string" ? (session.conversation_id as string) : undefined;
      const fromFlatConv = typeof (data as Record<string, unknown>).conversation_id === "string" ? ((data as Record<string, unknown>).conversation_id as string) : undefined;
      const fromData = typeof data.id === "string" ? (data.id as string) : undefined;
      return fromConvo || fromSessionConv || fromSessionId || fromFlatConv || fromData;
    } catch {
      return undefined;
    }
  }

   const handleToggleDocSelect = useCallback(async (id: string) => {
    await disconnect();
    setSelectedFileIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);


  const handleCreateConversation = () => {
    if (!agentId || createConvMutation.isPending) return;
    createConvMutation.mutate(
      { agentId },
      {
        onSuccess: async (resp) => {
          // Invalidate conversations list for this agent
          queryClient.invalidateQueries({ queryKey: ["agent", "conversation", agentId] , exact: false });
          const id = extractSessionId(resp);
          if (id) {
            // Clear previous local conv id then set to new
            await secureRemoveItem("conv");
            setSelectedId(id);
            setConversationId(id);
            secureSetItem("conv", { id });
            connect(agentId, accessToken, selectedFileIds, id);
          }
        },
        onError: (e) => {
          console.error("Failed to create conversation", e);
        },
      }
    );
  };

  // Persist and rehydrate selected document IDs (optional)
  const selectedKey = useMemo(() => {
    if (conversationId) return `docsel:${conversationId}`;
    if (agentId) return `docsel:agent:${agentId}`;
    return undefined;
  }, [conversationId, agentId]);

  useEffect(() => {
    if (!agentId || !accessToken || !conversationId) return;
    let mounted = true;
    (async () => {
      if (!isConnected && !isConnecting && conversationId) {
        // Hydrate selected file IDs from storage first so the initial connect has them
        let nextIds = selectedFileIds;
        if (selectedKey) {
          const stored = await secureGetItem<{ ids?: string[] }>(selectedKey);
          if (!mounted) return;
          const ids = Array.isArray(stored) ? (stored as unknown as string[]) : stored?.ids;
          if (Array.isArray(ids)) {
            nextIds = ids;
          }
        }
        const finalIds = isRefreshed.current || (selectedFileIds.length > 0 && nextIds.length === 0) ? selectedFileIds : nextIds;
        // Initial connect includes current/hydrated selected files
        connect(agentId, accessToken, finalIds, conversationId);

        prevSelectedIdsRef.current = isRefreshed.current || (selectedFileIds.length > 0 && nextIds.length === 0) ? selectedFileIds : nextIds;
        isRefreshed.current = true;
        return;
      }
    })();
    return () => { mounted = false; };
  }, [agentId, accessToken, conversationId, selectedKey, selectedFileIds, isConnected, isConnecting, connect, updateSelectedFiles]);

  // (Removed extra CONNECTING updater to avoid double init)



  // Build history groups from API data
  const groups: HistoryGroup[] = useMemo(() => {
    const convs = (conversationData as { data?: { conversations?: Array<{ id: string; title?: string; created_at?: string }> } } | undefined)?.data?.conversations ?? [];
    const items = convs.map((c) => ({
      id: c.id,
      title: c.title || "No Title",
      preview: "To do",
      timeLabel: c.created_at ? formatUSTimeSafe(c.created_at) : "",
    }));
    return [
      {
        label: "Conversations",
        items,
      },
    ];
  }, [conversationData]);

  const handleExportChat = useCallback(async (from: Date, to: Date) => {
    console.log(from, to, "values")
    if (!conversationId) return;
    try {
      const resp = await exportConversation(conversationId, from, to);
      if (!resp || !resp.status) return;
      const base64 = resp.base64_pdf || resp.base64_csv;
      const mime = resp.mime_type || "application/pdf";
      const fileName = resp.file_name || `conversation_${conversationId}.pdf`;
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
  }, [conversationId]);

  // Map paginated conversation messages into ChatMessage[] and sync to state
  useEffect(() => {
    if (!messagesPages) return;
    const pages = Array.isArray((messagesPages as { pages?: unknown[] }).pages)
      ? ((messagesPages as { pages: Array<{ data?: { messages?: Array<Record<string, unknown>> } }> }).pages)
      : [];
    const rawMsgs = pages.flatMap((p) => Array.isArray(p.data?.messages) ? p.data!.messages! : []);
    const mapped: ChatMessage[] = rawMsgs.map((m, idx) => {
      const id = typeof m.id === "string" ? (m.id as string) : `m-${Date.now()}-${idx}`;
      const role = typeof (m as Record<string, unknown>).message_type === "string" ? ((m as Record<string, unknown>).message_type as string) : "";
      const sender: "assistant" | "user" = role.toLowerCase() === "assistant" ? "assistant" : "user";
      const created = (m as Record<string, unknown>).sent_at ?? (m as Record<string, unknown>).created_at ?? (m as Record<string, unknown>).timestamp;
      const time = formatUSTimeSafe(created);
      const text = typeof (m as Record<string, unknown>).content === "string" ? ((m as Record<string, unknown>).content as string) :
        typeof (m as Record<string, unknown>).text === "string" ? ((m as Record<string, unknown>).text as string) : "";
      return { id, kind: "text", sender, text, time };
    });
    setMessages(mapped);
  }, [messagesPages]);

  const handleSelectConversation = useCallback(async (id: string) => {
    await disconnect();
    //Clear audio state
     demoAudioServiceRef.current?.resetAudioState();
     setIsAudioPaused(true)
    setSelectedId(id);
    setConversationId(id);
    if (isConnected) disconnect();
    setMessages([]);
    secureSetItem("conv", { id });
  }, [disconnect, isConnected]);

  // On mount or agent change, read persisted conversation id
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
      if (agentId && !createConvMutation.isPending && !stored?.id) {
        createConvMutation.mutate(
          { agentId },
          {
            onSuccess: async (resp: unknown) => {
              // refresh conversations list
              queryClient.invalidateQueries({ queryKey: ["agent", "conversation", agentId], exact: false });
              const id = extractSessionId(resp);
              if (id) {
                await secureRemoveItem("conv");
                setSelectedId(id);
                setConversationId(id);
                secureSetItem("conv", { id });
                connect(agentId, accessToken, selectedFileIds, id);
              }
            },
            onError: (e) => {
              console.error("Failed to auto-create conversation", e);
            },
          }
        );
      }
    })();
    return () => {
     mounted = false;
      demoAudioServiceRef.current?.resetAudioState();
     setIsAudioPaused(true)
     };
  }, [agentId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedKey) return;
      const stored = await secureGetItem<{ ids?: string[] }>(selectedKey);
      if (!mounted) return;
      const ids = Array.isArray(stored) ? (stored as unknown as string[]) : stored?.ids;
      if (Array.isArray(ids)) setSelectedFileIds(ids);
    })();
    return () => { mounted = false; };
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedKey) return;
    (async () => {
      try {
        await secureSetItem(selectedKey, { ids: selectedFileIds });
      } catch {
        // ignore persist errors
      }
    })();
  }, [selectedKey, selectedFileIds]);

  return (
    <UserLayout>
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
            isAudioRunning={hasAudio && !isAudioPaused}
            audioWarningText="Switching conversations will reset audio for the new conversation."
          />
        </div>
        <div className="lg:col-span-8" data-tour="chat-window">
          <ChatWindow
            coachName={coachName}
            onBack={() => navigate(-1)}
            onSendText={(t) => {
              demoAudioServiceRef.current?.resetAudioState();
              setHasAudio(false);
              setIsAudioPaused(false);
              // Add user message and a processing placeholder
              const timeStr = formatUSTimeSafe(new Date());
              setMessages((prev) => ([
                ...prev.filter((m) => m.kind !== 'processing'),
                { id: `msg-${Date.now()}-user`, kind: 'text', sender: 'user', text: t, time: timeStr },
                { id: `msg-${Date.now()}-assistant`, kind: 'processing', sender: 'assistant', time: timeStr, isProcessing: true, type: 'processing' },
              ]));
              sendTextMessage(t);
            }}
            onToggleRecording={() => (isRecording ? stopRecording() : startRecording())}
            isRecording={isRecording}
            hasAudio={hasAudio}
            isAudioPaused={isAudioPaused}
            isMuted={isMuted}
            onToggleMute={(next) => {
              setIsMuted(next);
              if (isConnected) updateContinuousMute(next);
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
            isConnecting={isConnecting}
            statusBanner={statusBanner}
            convIsLoading={isLoadingConversation}
            hasMore={!!hasMoreMessages}
            onLoadMore={() => { if (hasMoreMessages && !isFetchingMore) { fetchNextPage(); } }}
            convIsFetchingNext={isFetchingMore}
            // Controlled documents
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
