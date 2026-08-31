import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GripHorizontal, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResizableHeight } from "@/hooks/useResizableHeight";
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
import { V2Card, SectionLabel } from "@/components/v2";
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
  autoSendDisplayText,
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
  onExportMessage,
  stacked,
}: ChatWindowProps) {
  const { t } = useTranslation("chat");
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
    // Deliberately NOT written into the composer first. Setting and clearing
    // it in the same effect is invisible in React 18 (both updates batch),
    // but under any path that flushed between them the injected prompt —
    // scaffolding and all — would flash in the input box.
    onSendText?.(text, autoSendDisplayText?.trim() || undefined);
  }, [autoSendText, autoSendDisplayText, onSendText]);

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
  t("conversation.waiting.shortly", { defaultValue: "{{coachName}} will be with you shortly", coachName }),
  t("conversation.waiting.oneMoment", { defaultValue: "One moment with {{coachName}}", coachName }),
  t("conversation.waiting.pleaseWait", { defaultValue: "Please wait" })
];

const genericMessages =
  coachMessages[getSecureRandomInt(coachMessages.length)];

  let muteTooltipText = t("input.muteTooltip.mute", { defaultValue: "Mute" });
  if (hasAudio && !isAudioPaused) muteTooltipText = t("input.muteTooltip.disabledDuringPlayback", { defaultValue: "Mute is disabled during playback" });
  else if (isMuted) muteTooltipText = t("input.muteTooltip.unmute", { defaultValue: "Unmute" });

  const selectedDocsTooltip = selectedDocNames ? selectedDocNames.map(stripPdfExt).join(", ") : "";

  // User-controlled height for the V2 Conversation card (persisted). `null`
  // until the first drag, so the card keeps its flex-1 fill by default. Declared
  // unconditionally (before the `stacked` return) to satisfy the rules of hooks.
  const {
    height: convHeight,
    handleProps: convHandleProps,
    reset: convResetHeight,
  } = useResizableHeight("meridian-conversation-height", { min: 260, max: 1400 });

  // ── HomeV2 stacked layout ────────────────────────────────────────────
  // Two separate cards — a full-height scrollable "Conversation" on top and
  // "Compose Prompt" beneath it (2026-08-05; the composer used to sit above).
  // Putting the composer last matches how every other chat surface reads: the
  // transcript occupies the page and the box you type in sits at the bottom
  // edge, next to the newest message rather than a scroll away from it.
  //
  // Reuses every piece of ChatWindow state/handlers (inputText, handleSend,
  // scroll refs, auto-send/auto-scroll effects, modals); only the arrangement
  // + skin differ. The classic single-card layout below is unchanged. Export
  // is triggered from the page header in V2, so no export trigger here.
  //
  // The Conversation card is user-resizable: a drag strip at its bottom sets a
  // persisted height (double-click / the reset control returns it to the
  // automatic full-height fill).
  if (stacked) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
        {/* Conversation card — vertically visible top→bottom, scrollable, and
            user-resizable via the drag strip at its bottom edge. */}
        <V2Card
          className={cn(
            "relative flex min-h-0 flex-col overflow-hidden p-0",
            // flex-1 only while the user hasn't chosen a height; once they have,
            // the explicit height below wins and the card stops flexing.
            convHeight == null && "flex-1"
          )}
          style={convHeight != null ? { height: convHeight, flex: "none" } : undefined}
          data-testid="v2-conversation-card"
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3 md:px-5">
            <SectionLabel>{t("conversation.sectionLabel", { defaultValue: "Conversation" })}</SectionLabel>
            <div className="flex items-center gap-3">
              {convHeight != null && (
                <button
                  type="button"
                  onClick={convResetHeight}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  title={t("conversation.resetSize", { defaultValue: "Reset conversation size" })}
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                  {t("conversation.resetSize", { defaultValue: "Reset size" })}
                </button>
              )}
              <span className="font-serif text-sm font-semibold text-ink">{coachName}</span>
            </div>
          </div>
          <div
            ref={scrollRef}
            className={cn(
              // 5px inset on all sides so a full-width response bubble sits ~5px
              // from the tile edges (item 4). Extra bottom room only when the
              // floating audio player is up.
              "flex-1 overflow-auto p-[5px]",
              audioPlayerBuffer && showAudioPlayer && "pb-40"
            )}
          >
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
              onExportMessage={onExportMessage}
              responseBubbleFullWidth
            />
          </div>
          {/* Drag strip: resize the conversation height; double-click to reset. */}
          <div
            {...convHandleProps}
            onDoubleClick={convResetHeight}
            title={t("conversation.dragToResize", { defaultValue: "Drag to resize · double-click to reset" })}
            aria-label={t("conversation.dragToResize", { defaultValue: "Drag to resize the conversation" })}
            className="group flex h-3 shrink-0 cursor-ns-resize touch-none items-center justify-center border-t border-hairline bg-muted/40 hover:bg-muted"
          >
            <GripHorizontal className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" aria-hidden />
          </div>
          {/* Floating audio player pinned above the resize strip */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 [&>*]:pointer-events-auto">
            <ChatWindowFloatingAudioPlayer
              audioPlayerBuffer={audioPlayerBuffer}
              showAudioPlayer={showAudioPlayer}
              onCloseAudioPlayer={onCloseAudioPlayer}
            />
          </div>
        </V2Card>

        {/* Compose Prompt card — now beneath the conversation, and deliberately
            slimmer than it was: `shrink-0` so it never gets squeezed, tighter
            padding, and the section label inline with the status banner rather
            than on its own line. The height it gives up goes to the transcript.

            The textarea inside is user-expandable (drag strip at the bottom
            edge) for composing something longer than the auto-grow ceiling —
            the same interaction, and the same hook, as the Conversation card
            above it. */}
        <V2Card
          className="flex shrink-0 flex-col gap-2 p-3 md:p-4"
          data-testid="v2-compose-card"
        >
          <div className="flex items-center gap-3">
            <SectionLabel>{t("compose.sectionLabel", { defaultValue: "Compose Prompt" })}</SectionLabel>
            <div className="min-w-0 flex-1">
              <ChatWindowTopBanner
                selectedDocNames={selectedDocNames}
                selectedSummary={selectedSummary}
                selectedTooltip={selectedDocsTooltip}
                isConnecting={isConnecting}
                statusBanner={statusBanner}
                activeTab="chat"
                selectDocsLottieSrc={selectDocsLottieSrc}
              />
            </div>
          </div>
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
            expandable
          />
        </V2Card>

        {copied ? (
          <div className="fixed right-6 bottom-10 z-50">
            <div className="rounded-xl bg-black/80 text-white text-sm px-3 py-2 shadow">
              {t("common.copiedToClipboard", { defaultValue: "Copied to clipboard" })}
            </div>
          </div>
        ) : null}

        {/* Preview + documents modals — identical wiring to the classic layout */}
        <DocumentIframeModal
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          fileUrl={viewer.url}
          fileName={viewer.name}
        />
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
        <UploadDocumentsModal
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUploaded={handleUploaded}
        />
      </div>
    );
  }

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
            onExportMessage={onExportMessage}
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
