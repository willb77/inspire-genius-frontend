import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  Upload,
  Send,
  Copy,
  Mic,
  Pause,
  Play,
  Volume2,
  VolumeX,
  SquarePause,
  FileText,
  X,
  CirclePlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ExportChatModal from "@/components/user/chat/ExportChatModal";
import DocumentsPanel from "@/components/user/chat/DocumentsPanel";
import DocumentsSidePanel from "@/components/user/chat/DocumentsSidePanel";
import DocumentIframeModal from "@/components/user/chat/DocumentIframeModal";
import { Skeleton } from "@/components/ui/skeleton";
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import UploadDocumentsModal from "@/components/user/documents/UploadDocumentsModal";
import { useQueryClient } from "@tanstack/react-query";
import { AudioPlayer } from "@/components/shared/audio-player/audio-player";
import { useChatWindowAudio } from "@/hooks/useChatWindowAudio";
import type {
  ChatWindowProps,
  SimpleDoc,
  DocumentRef,
  ChatMessage,
} from "@/types/chat";

export default function ChatWindow({
  coachName,
  className,
  onBack,
  onSendText,
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
  showAudioPlayer
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
  const renderMessages: ChatMessage[] = useMemo(() => externalMessages ?? [], [externalMessages]);
  const lastMessageId = renderMessages?.length
    ? renderMessages[renderMessages?.length - 1]?.id
    : undefined;

  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);

  const {
    hasAudioForMessageId,
    playForMessageId,
    activeBuffer,
    playerKey,
    clearOverride,
  } = useChatWindowAudio({
    messages: renderMessages,
    audioPlayerBuffer,
    showAudioPlayer,
    setShowAudioPlayer,
    onCloseAudioPlayer,
  });

  const selectDocsLottieSrc = useMemo(() => {
    const options = [
      "https://lottie.host/embed/f13eb55b-1ae1-41cf-ba8b-33a5f1fb0028/zpOwzGQlox.lottie",
      "https://lottie.host/embed/0282a5cd-2be0-4629-b8aa-6b25db7da055/jaFMoZJmcz.lottie",
    ];
    return options[Math.floor(Math.random() * options.length)];
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
  const didInitialAutoScrollRef = useRef(false);
  const stickToBottomRef = useRef(true);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    // Sending a message is an explicit user action: always snap back to bottom.
    stickToBottomRef.current = true;

    onSendText?.(text);
    setInputText("");

    window.setTimeout(() => {
      const node = bottomRef.current;
      if (!node) return;
      try {
        node.scrollIntoView({ behavior: "smooth", block: "end" });
      } catch {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }
    }, 0);
  };

  const lastMessageSignature = useMemo(() => {
    const last = externalMessages?.length
      ? externalMessages[externalMessages.length - 1]
      : undefined;
    if (!last) return "";
    if (last.kind === "text") return `${last.id}:${last.text?.length ?? 0}`;
    if (last.kind === "processing") return `${last.id}:processing`;
    return `${last.id}:${String((last as { kind?: unknown }).kind ?? "unknown")}`;
  }, [externalMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateStickToBottom = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom <= 400;
    };
    const onScroll = () => {
      updateStickToBottom();
      if (!hasMore || !onLoadMore || convIsFetchingNext) return;
      const threshold = 200;
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < threshold) {
        onLoadMore();
      }
    };
    updateStickToBottom();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, onLoadMore, convIsFetchingNext]);

  // Auto-scroll to bottom when new messages render
  useEffect(() => {
    if (activeTab !== "chat") return;
    if (!externalMessages || externalMessages.length === 0) return;

    if (!didInitialAutoScrollRef.current) {
      didInitialAutoScrollRef.current = true;
    } else if (!stickToBottomRef.current) {
      return;
    }

    const node = bottomRef.current;
    if (!node) return;
    try {
      node.scrollIntoView({ behavior: "smooth", block: "end" });
    } catch {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageSignature, activeTab]);

  useEffect(() => {
    if (activeTab === "chat") return;
    didInitialAutoScrollRef.current = false;
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    const audioVisible = !!activeBuffer && !!showAudioPlayer;
    const wasVisible = prevAudioVisibleRef.current;
    prevAudioVisibleRef.current = audioVisible;

    if (!audioVisible || wasVisible) return;
    if (!stickToBottomRef.current) return;

    const node = bottomRef.current;
    if (!node) return;
    window.setTimeout(() => {
      try {
        node.scrollIntoView({ behavior: "smooth", block: "end" });
      } catch {
        const fallback = scrollRef.current;
        if (fallback) fallback.scrollTop = fallback.scrollHeight;
      }
    }, 50);
  }, [activeTab, activeBuffer, showAudioPlayer]);
  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl border shadow-sm flex flex-col h-[calc(100vh-8rem)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            aria-label="Back"
            onClick={onBack}
            className="cursor-pointer p-1 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-base font-semibold">{coachName}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <button
              className={cn(
                "cursor-pointer px-2 py-1 border-b-2 text-sm",
                activeTab === "chat"
                  ? "border-blue-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
            <button
              disabled={false}
              className={cn(
                "hidden cursor-pointer px-2 py-1 border-b-2 text-sm",
                activeTab === "documents"
                  ? "border-blue-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
              onClick={() => setActiveTab("documents")}
            >
              Documents
            </button>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                className="h-9 bg-transparent px-3 rounded-lg text-sm font-normal"
                onClick={() => setDocsOpen(true)}
                aria-label="Open documents side panel"
              >
                <FileText className="size-4 mr-1" />
                Documents
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Open documents panel to select files to add to chat</TooltipContent>
          </Tooltip>
          <Button
            className="bg-brown-250 hover:bg-brown-250/90 text-white h-9 px-3 rounded-lg"
            variant="secondary"
            disabled={false}
            onClick={() => setExportOpen(true)}
          >
            <Upload className="size-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Body */}

      <div
        className={cn(
          "flex-1 overflow-auto p-4",
          activeBuffer && showAudioPlayer ? "pb-40" : "pb-6"
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle at 10px 10px, rgba(246, 184, 108, 0.08) 2px, transparent 2px), radial-gradient(circle at 30px 30px, rgba(246, 184, 108, 0.06) 2px, transparent 2px)",
          backgroundSize: "48px 48px",
          backgroundPosition: "0 0, 24px 24px",
        }}
        ref={scrollRef}
      >
        {selectedDocNames && selectedDocNames.length ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="min-h-10 w-full mb-3 inline-flex items-start gap-1 text-xs bg-blue-50 text-blue-900 border border-blue-200 rounded-md px-2 py-1">
                <span>Selected:</span>
                <span className="font-semibold">{selectedSummary}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{selectedDocNames.map(stripPdfExt).join(", ")}</TooltipContent>
          </Tooltip>
        ) : isConnecting ? (
          <div className="text-xs text-blue-600">Connecting...</div>
        ) : statusBanner && activeTab === "chat" ? (
          <div
            className={cn(
              "flex justify-center items-center gap-2 text-xs font-medium",
              statusBanner.type === "success"
                ? "text-green-600"
                : statusBanner.type === "error"
                ? "text-red-600"
                : "text-gray-600"
            )}
          >
            {statusBanner.text}
            {statusBanner.type === "success" ? (
              <div className="w-fit">
                <iframe
                  src={selectDocsLottieSrc}
                  title="Success animation"
                  className="h-24 w-24"
                  allow="autoplay"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "chat" ? (
          <div className="space-y-4">
            {convIsLoading ? (
              <div className="space-y-4 px-4 mt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      i % 2 === 0 ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl p-3",
                        i % 2 === 0 ? "bg-gray-100" : "bg-gray-100"
                      )}
                    >
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="px-4 space-y-4 mt-4">
              {renderMessages.map((m) => {
                if (m.kind === "text") {
                  const right = m.sender === "user";
                  return (
                    <div key={m.id} className="space-y-1">
                      <div className={cn("max-w-[70%] min-w-40 w-fit ", right ? "ml-auto" : undefined)}>
                        <div
                          className={cn(
                            "rounded-2xl p-3 text-sm text-foreground/90 shadow-sm",
                            right ? "bg-gray-100" : "bg-gray-100"
                          )}
                        >
                          {m.sender === "assistant" ? (
                            <AssistantMarkdown
                              text={m.text}
                              className="text-left"
                            />
                          ) : (
                            m.text
                          )}
                        </div>
                        <div
                          className={cn(
                            "max-w-full min-w-40 w-full flex items-center justify-between mt-2 px-2",
                            right ? "ml-auto" : undefined
                          )}
                        >
                          <div className="flex items-center gap-4">
                          <button
                            aria-label="Copy message"
                            type="button"
                            className="cursor-pointer text-muted-foreground/60 hover:text-foreground"
                            onClick={() => handleCopy(m.text)}
                          >
                            <Copy className="size-4 text-black" />
                          </button>
                           {m.sender === "assistant" && ((m.id === lastMessageId && !!audioPlayerBuffer) || hasAudioForMessageId(m.id)) ? (
                             <CirclePlay
                               className="size-4.5 text-blue-800 cursor-pointer"
                               onClick={() => {
                                 playForMessageId(m.id).catch(() => {
                                   // ignore
                                 });
                               }}
                             />
                           ) : null}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {m.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (m.kind === "processing") {
                  return (
                    <div key={m.id} className="space-y-1">
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl p-3 text-sm shadow-sm bg-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-1 h-5">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <motion.span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-blue-800"
                              initial={{ opacity: 0.4, y: 0 }}
                              animate={{
                                opacity: [0.4, 1, 0.4],
                                y: [0, -3, 0],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.15,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "max-w-[70%] flex items-center justify-between mt-2 px-2"
                        )}
                      >
                        <div className="text-xs text-muted-foreground">
                          {coachName} is processing…
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.time}
                        </div>
                      </div>
                    </div>
                  );
                }
                // doc bubble
                const right = m.sender === "user";
                return (
                  <div key={m.id} className="space-y-1">
                    <div
                      className={cn(
                        "max-w-[70%] border rounded-2xl p-3 text-sm shadow-sm bg-white",
                        right ? "ml-auto" : undefined
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-xs font-medium",
                            m.docKind === "pdf"
                              ? "bg-red-50 text-red-600"
                              : m.docKind === "csv"
                              ? "bg-green-50 text-green-600"
                              : m.docKind === "ppt"
                              ? "bg-orange-50 text-orange-600"
                              : "bg-blue-50 text-blue-600"
                          )}
                        >
                          {m.docKind.toUpperCase()}
                        </span>
                        <span className="truncate">{m.docName}</span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "max-w-[70%] flex items-center justify-between mt-2 px-2",
                        right ? "ml-auto" : undefined
                      )}
                    >
                      <button
                        aria-label="Copy message"
                        type="button"
                        className="cursor-pointer text-muted-foreground/60 hover:text-foreground"
                        onClick={() => handleCopy(`${m.docName}`)}
                      >
                        <Copy className="size-4 text-black" />
                      </button>
                      <div className="text-xs text-muted-foreground">
                        {m.time}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            {convIsFetchingNext ? (
              <div className="space-y-4 px-4 mt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`more-${i}`}
                    className={cn(
                      "flex",
                      i % 2 === 0 ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl p-3",
                        i % 2 === 0 ? "bg-gray-100" : "bg-gray-100"
                      )}
                    >
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <>
       
            <DocumentsPanel
              onImportToChat={onImportDocs}
              onPreview={onPreview}
              // Controlled docs from parent (CoachChat)
              sections={docSections}
              selectedIds={selectedFileIds}
              onToggleSelect={onToggleDocSelect}
              isLoading={docIsLoading}
              onDelete={docOnDelete}
              onDownload={docOnDownload}
              setupUploadOpen={setUploadOpen}
            />
          </>
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
      {(() => {
        if (!activeBuffer || !showAudioPlayer) return null;
        return (
        <div className="px-3">
          <div className="relative">
            <button
              type="button"
              aria-label="Close audio player"
              className="cursor-pointer p-0.5 absolute z-10 -right-0.5 bg-blue-900 rounded-full -top-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                clearOverride();
              }}
            >
              <X className="h-4 w-4 text-white" />
            </button>
            <AudioPlayer key={playerKey} audioBuffer={activeBuffer} autoPlay deferReloadWhilePlaying />
          </div>
        </div>
        );
      })()}

      {/* Small floating sparkle action */}
      {/* <button
        type="button"
        aria-label="Assistant action"
        className="absolute left-4 bottom-24 grid place-items-center rounded-xl shadow h-10 w-10 text-white"
        style={{ background: "linear-gradient(135deg, #55362A, #466BC4)" }}
      >
        <Sparkles className="size-5" />
      </button> */}

  

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <button
              type="button"
              disabled={false}
              onClick={() => onToggleRecording?.()}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              aria-pressed={!!isRecording}
              className="cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center"
            >
              {isRecording ? <SquarePause className={cn(
                  "size-5",
                  isRecording ? "text-red-600 animate-pulse" : "text-black"
                )}/> : 
              <Mic
                className={cn(
                  "size-5",
                  isRecording ? "text-red-600 animate-pulse" : "text-black"
                )}
              />}
            </button>
            <Input
              placeholder={isRecording ? "" : "Ask Anything...."}
              className="cursor-pointer h-11 pl-10 pr-10 rounded-xl bg-gray-100"
              value={inputText}
              disabled={false}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {isRecording ? (
              <div className="pointer-events-none absolute left-10 right-16 top-1/2 -translate-y-1/2 flex items-end gap-1 h-5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 rounded-full bg-blue-600/80"
                    initial={{ height: 6 }}
                    animate={{ height: [6, 18, 10, 22, 8, 16] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            ) : null}
            {/* <Paperclip className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" /> */}
          </div>

          {hasAudio && onToggleAudioPlayback ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={false}
                  type="button"
                  onClick={onToggleAudioPlayback}
                  variant="secondary"
                  className="h-11 px-3"
                >
                  {isAudioPaused ? (
                    <Play className="size-5" />
                  ) : (
                    <Pause className="size-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="text-xs">{isAudioPaused ? "Play" : "Pause"}</span>
              </TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                className="h-11 px-3 hidden"
              
                onClick={() => {
                  if (hasAudio && !isAudioPaused) return;
                  const next = !isMuted;
                  onToggleMute?.(next);
                }}
                disabled={!!(hasAudio && !isAudioPaused)}
                aria-label={isMuted ? "Unmute Coach" : "Mute Coach"}
              >
                {isMuted ? (
                  <VolumeX className="size-5" />
                ) : (
                  <Volume2 className="size-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {hasAudio && !isAudioPaused ? (
                <span className="text-xs">
                  Mute is disabled during playback
                </span>
              ) : isMuted ? (
                <span className="text-xs text-white/10">Unmute</span>
              ) : (
                <span className="text-xs">Mute</span>
              )}
            </TooltipContent>
          </Tooltip>
          <Button
            disabled={false}
            className="bg-blue-primary hover:bg-blue-primary/90 h-11 px-3"
            onClick={handleSend}
          >
            <Send className="size-5" />
          </Button>
        </div>
      </div>

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
