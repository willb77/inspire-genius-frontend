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
  Paperclip,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ExportChatModal from "@/components/user/chat/ExportChatModal";
import DocumentsPanel from "@/components/user/chat/DocumentsPanel";
import DocumentIframeModal from "@/components/user/chat/DocumentIframeModal";
import { Skeleton } from "@/components/ui/skeleton";
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
}: ChatWindowProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "documents">("chat");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string }>({
    url: "",
    name: "",
  });
  const [exportOpen, setExportOpen] = useState(false);
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
  const selectedSummary = useMemo(() => {
    if (!selectedDocNames || selectedDocNames.length === 0) return "";
    const head = selectedDocNames.slice(0, 2).map((n, i) => (i === 1 ? middleTruncate(n, 18) : n));
    return head.join(", ") + (selectedDocNames.length > 2 ? " …" : "");
  }, [selectedDocNames]);

  // Messages come from parent
  const renderMessages: ChatMessage[] = [...(externalMessages ?? [])];

  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);
  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };
  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    onSendText?.(text);
    setMessages?.((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        kind: "text",
        sender: "user",
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setInputText("");
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);

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
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-base font-semibold">{coachName}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <button
              className={cn(
                "px-2 py-1 border-b-2 text-sm",
                activeTab === "chat"
                  ? "border-blue-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
            <button
            disabled={true}
              className={cn(
                "px-2 py-1 border-b-2 text-sm",
                activeTab === "documents"
                  ? "border-blue-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
              onClick={() => setActiveTab("documents")}
            >
              Documents
            </button>
          </div>
          <Button
            className="bg-brown-250 hover:bg-brown-250/90 text-white h-9 px-3 rounded-lg"
            variant="secondary"
            disabled={true}
            onClick={() => setExportOpen(true)}
          >
            <Upload className="size-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Body */}

      <div
        className="flex-1 overflow-auto p-4"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10px 10px, rgba(246, 184, 108, 0.08) 2px, transparent 2px), radial-gradient(circle at 30px 30px, rgba(246, 184, 108, 0.06) 2px, transparent 2px)",
          backgroundSize: "48px 48px",
          backgroundPosition: "0 0, 24px 24px",
        }}
        ref={scrollRef}
      >
        {selectedDocNames && selectedDocNames.length > 0  ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-900 border border-blue-200 rounded-md px-2 py-1">
                <span>Selected:</span>
                <span className="font-semibold">{selectedSummary}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{selectedDocNames.join(", ")}</TooltipContent>
          </Tooltip>
        ) : isConnecting ? (
          <div className="text-xs text-blue-600">Connecting...</div>
        ) : statusBanner && activeTab === "chat" ? (
          <div
            className={cn(
              "text-xs font-medium",
              statusBanner.type === "success"
                ? "text-green-600"
                : statusBanner.type === "error"
                ? "text-red-600"
                : "text-gray-600"
            )}
          >
            {statusBanner.text}
          </div>
        ) : null}
        {activeTab === "chat" ? (
          <div className="space-y-4">
            {convIsLoading ? (
              <div className="space-y-4 px-4 mt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}> 
                    <div className={cn("max-w-[70%] rounded-2xl p-3", i % 2 === 0 ? "bg-gray-100" : "bg-gray-100")}>
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
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl p-3 text-sm text-foreground/90 shadow-sm",
                          right ? "ml-auto bg-gray-100" : "bg-gray-100"
                        )}
                      >
                        {m.sender === "assistant" ? (
                          <AssistantMarkdown text={m.text} className="text-left" />
                        ) : (
                          m.text
                        )}
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
                          onClick={() => handleCopy(m.text)}
                        >
                          <Copy className="size-4 text-black" />
                        </button>
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
                        className="text-muted-foreground/60 hover:text-foreground"
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
            </div>
            {convIsFetchingNext ? (
              <div className="space-y-4 px-4 mt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`more-${i}`} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}> 
                    <div className={cn("max-w-[70%] rounded-2xl p-3", i % 2 === 0 ? "bg-gray-100" : "bg-gray-100")}> 
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
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
      <ExportChatModal open={exportOpen} onOpenChange={setExportOpen} onExport={onExportChat} />

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
              className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center"
            >
              <Mic
                className={cn(
                  "size-5",
                  isRecording
                    ? "text-red-600 animate-pulse"
                    : "text-black"
                )}
              />
            </button>
            <Input
              placeholder={isRecording ? "" : "Ask Anything...."}
              className="cursor-pointer h-11 pl-10 pr-10 rounded-xl bg-gray-100"
              value={inputText}
              disabled={true}
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
            <Paperclip className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          </div>

          {hasAudio && onToggleAudioPlayback ? (
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
          ) : null}
          <Button
            disabled={true}
            className="bg-blue-primary hover:bg-blue-primary/90 h-11 px-3"
            onClick={handleSend}
          >
            <Send className="size-5" />
          </Button>
        </div>
      </div>

      {copied ? (
        <div className="fixed right-6 bottom-24 z-50">
          <div className="rounded-xl bg-black/80 text-white text-sm px-3 py-2 shadow">
            Copied to clipboard
          </div>
        </div>
      ) : null}
    </div>
  );
}
