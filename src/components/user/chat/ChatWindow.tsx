import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import ExportChatModal from "@/components/user/chat/ExportChatModal";
import DocumentsPanel from "@/components/user/chat/DocumentsPanel";
import DocumentsSidePanel from "@/components/user/chat/DocumentsSidePanel";
import DocumentIframeModal from "@/components/user/chat/DocumentIframeModal";
import UploadDocumentsModal from "@/components/user/documents/UploadDocumentsModal";
import { useQueryClient } from "@tanstack/react-query";
import ChatWindowHeader from "@/components/user/chat/ChatWindowHeader";
import ChatWindowTopBanner from "@/components/user/chat/ChatWindowTopBanner";
import ChatWindowChatTab from "@/components/user/chat/ChatWindowChatTab";
import ChatWindowFloatingAudioPlayer from "@/components/user/chat/ChatWindowFloatingAudioPlayer";
import ChatWindowInputBar from "@/components/user/chat/ChatWindowInputBar";
import type {
  ChatWindowProps,
  SimpleDoc,
  DocumentRef,
  ChatMessage,
} from "@/types/chat";

const getSecureRandomInt = (maxExclusive: number) => {
  if (maxExclusive <= 0) return 0;

  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") return 0;

  const range = 0x100000000; // 2^32
  const limit = range - (range % maxExclusive);
  const buffer = new Uint32Array(1);

  let value = 0;
  do {
    cryptoObj.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= limit);

  return value % maxExclusive;
};

export default function ChatWindow({
  coachName,
  coachId,
  conversationId,
  className,
  onBack,
  onSendText,
  autoSendText,
  onToggleRecording,
  isRecording,
  hasAudio,
  isAudioPaused,
  onToggleAudioPlayback,
  // Mute control
  isMuted,
  onToggleMute,
  messages: externalMessages,
  isConnecting,
  statusBanner,
  setMessages,
  convIsLoading,
  convIsFetchingNext,
  hasMore,
  onLoadMore,
  onExportChat,
  selectedFileIds,
  selectedDocNames,
  docSections,
  docIsLoading,
  onToggleDocSelect,
  docOnDelete,
  docOnDownload,
  audioPlayerBuffer,
  onCloseAudioPlayer,
  setShowAudioPlayer,
  showAudioPlayer,
  onReplayMessage,
}: ChatWindowProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "documents">("chat");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string }>({
    url: "",
    name: "",
  });
  const [exportOpen, setExportOpen] = useState(false);
  const queryClient = useQueryClient();

  const onImportDocs = (items: SimpleDoc[]) => {
    if (!items.length) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages?.((prev) => [
      ...prev,
      ...items.map((d, idx) => ({
        id: `m-imp-${Date.now()}-${idx}`,
        kind: "doc" as const,
        sender: "user" as const,
        docName: d.name,
        docKind: d.kind,
        time: timeStr,
      })),
    ]);
    setActiveTab("chat");
  };

  const handleUploaded = () => {
    queryClient.invalidateQueries({ queryKey: ["file_service", "list"] });
    setUploadOpen(false);
  };
  const onPreview = (item: DocumentRef) => {
    if (!item.url) return;
    setViewer({ url: item.url, name: item.name });
    setViewerOpen(true);
  };

  const middleTruncate = (s: string, max: number) => {
    if (s.length <= max) return s;
    const half = Math.floor((max - 1) / 2);
    return `${s.slice(0, half)}…${s.slice(-half)}`;
  };
  const stripPdfExt = (name: string) => name.replace(/\.pdf$/i, "");
  const selectedSummary = useMemo(() => {
    if (!selectedDocNames || selectedDocNames.length === 0) return "";
    const head = selectedDocNames
      .slice(0, 10)
      .map((n, i) => {
        const base = stripPdfExt(n);
        return i === 1 ? middleTruncate(base, 18) : base;
      });
    return head.join(", ") + (selectedDocNames.length > 2 ? " …" : "");
  }, [selectedDocNames]);

  // Messages come from parent
  const renderMessages: ChatMessage[] = [...(externalMessages ?? [])];
  const lastMessageId = renderMessages?.length
    ? renderMessages[renderMessages?.length - 1]?.id
    : undefined;

  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-send: when navigated in with `autoSendText` (a starter question or the
  // HomeV2 ask box), prefill the composer and submit it exactly once so the
  // user lands directly on a live Meridian response.
  const autoSentRef = useRef(false);
  useEffect(() => {
    const text = autoSendText?.trim();
    if (!text || autoSentRef.current) return;
    autoSentRef.current = true;
    setInputText(text);
    onSendText?.(text);
    setInputText("");
  }, [autoSendText, onSendText]);

    const selectDocsLottieSrc = useMemo(() => {
    const options = [
      "https://lottie.host/embed/979ce88f-abf2-4fbe-9b3b-0b98f01f3900/yNrKdE9Ex1.lottie",
      "https://lottie.host/embed/f13eb55b-1ae1-41cf-ba8b-33a5f1fb0028/zpOwzGQlox.lottie",
      "https://lottie.host/embed/0282a5cd-2be0-4629-b8aa-6b25db7da055/jaFMoZJmcz.lottie",
    ];
    return options[getSecureRandomInt(options.length)];
  }, []);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };


  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevAudioVisibleRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const node = bottomRef.current;
    if (!node) return;
    try {
      node.scrollIntoView({ behavior, block: "end" });
    } catch {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    onSendText?.(text);
    setInputText("");

    window.setTimeout(() => scrollToBottom("smooth"), 0);

  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!hasMore || !onLoadMore || convIsFetchingNext) return;
      const threshold = 200;
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < threshold) {
        onLoadMore();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, onLoadMore, convIsFetchingNext]);

  // Auto-scroll to bottom when new messages render
  useEffect(() => {
    if (activeTab !== "chat") return;
    if (!externalMessages || externalMessages.length === 0) return;
    scrollToBottom("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessages?.length, activeTab]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    const audioVisible = !!audioPlayerBuffer && !!showAudioPlayer;
    const wasVisible = prevAudioVisibleRef.current;
    prevAudioVisibleRef.current = audioVisible;

    if (!audioVisible || wasVisible) return;

    const el = scrollRef.current;
    if (el) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom > 400) return;
    }

    const node = bottomRef.current;
    if (!node) return;
    window.setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);
  }, [activeTab, audioPlayerBuffer, showAudioPlayer]);

  const handleShowAudioPlayer = (open?: boolean) => {
    setShowAudioPlayer?.(open ?? false);
  };

  const coachMessages = [
  `${coachName} will be with you shortly`,
  `One moment with ${coachName}`,
  `Please wait`
];

const genericMessages =
  coachMessages[getSecureRandomInt(coachMessages.length)];

  let muteTooltipText = "Mute";
  if (hasAudio && !isAudioPaused) muteTooltipText = "Mute is disabled during playback";
  else if (isMuted) muteTooltipText = "Unmute";

  const selectedDocsTooltip = selectedDocNames ? selectedDocNames.map(stripPdfExt).join(", ") : "";
  
  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl border shadow-sm flex flex-col h-[calc(100vh-8rem)]",
        className
      )}
    >
      {/* Header */}
      <ChatWindowHeader
        coachName={coachName}
        activeTab={activeTab}
        onBack={onBack}
        onTabChange={setActiveTab}
        onOpenDocsSidePanel={() => setDocsOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        conversationId={conversationId}
      />

      {/* Body */}

      <div
        className={cn(
          "flex-1 overflow-auto p-4",
          audioPlayerBuffer && showAudioPlayer ? "pb-40" : "pb-6"
        )}
        ref={scrollRef}
      >
        <ChatWindowTopBanner
          selectedDocNames={selectedDocNames}
          selectedSummary={selectedSummary}
          selectedTooltip={selectedDocsTooltip}
          isConnecting={isConnecting}
          statusBanner={statusBanner}
          activeTab={activeTab}
          selectDocsLottieSrc={selectDocsLottieSrc}
        />

        {activeTab === "chat" ? (
          <ChatWindowChatTab
            convIsLoading={convIsLoading}
            convIsFetchingNext={convIsFetchingNext}
            renderMessages={renderMessages}
            bottomRef={bottomRef}
            onCopy={handleCopy}
            audioPlayerBuffer={audioPlayerBuffer}
            lastMessageId={lastMessageId}
            onShowAudioPlayer={() => handleShowAudioPlayer(true)}
            genericMessages={genericMessages}
            coachId={coachId}
            conversationId={conversationId}
            onReplayMessage={onReplayMessage}
          />
        ) : (
          <DocumentsPanel
            onImportToChat={onImportDocs}
            onPreview={onPreview}
            sections={docSections}
            selectedIds={selectedFileIds}
            onToggleSelect={onToggleDocSelect}
            isLoading={docIsLoading}
            onDelete={docOnDelete}
            onDownload={docOnDownload}
            setupUploadOpen={setUploadOpen}
          />
        )}
      </div>

      <DocumentIframeModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        fileUrl={viewer.url}
        fileName={viewer.name}
      />

      {/* Export chat modal */}
      <ExportChatModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        onExport={onExportChat}
        disableExport={false}
      />

      {/* Floating audio player (appears above the input when assistant audio completes) */}
      <ChatWindowFloatingAudioPlayer
        audioPlayerBuffer={audioPlayerBuffer}
        showAudioPlayer={showAudioPlayer}
        onCloseAudioPlayer={onCloseAudioPlayer}
      />

      {/* Input */}
      <ChatWindowInputBar
        inputText={inputText}
        onInputTextChange={setInputText}
        onSend={handleSend}
        onToggleRecording={onToggleRecording}
        isRecording={isRecording}
        hasAudio={hasAudio}
        isAudioPaused={isAudioPaused}
        onToggleAudioPlayback={onToggleAudioPlayback}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        muteTooltipText={muteTooltipText}
      />

      {copied ? (
        <div className="fixed right-6 bottom-40 z-50">
          <div className="rounded-xl bg-black/80 text-white text-sm px-3 py-2 shadow">
            Copied to clipboard
          </div>
        </div>
      ) : null}

      {/* Side documents panel */}
      <DocumentsSidePanel
        open={docsOpen}
        onOpenChange={setDocsOpen}
        sections={docSections}
        selectedIds={selectedFileIds}
        onToggleSelect={onToggleDocSelect}
        isLoading={docIsLoading}
        onDelete={docOnDelete}
        onDownload={docOnDownload}
        onImportToChat={onImportDocs}
        onPreview={onPreview}
        onUploadClick={() => setUploadOpen(true)}
      />

      {/* Upload documents modal (shared with Documents page flow) */}
      <UploadDocumentsModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
