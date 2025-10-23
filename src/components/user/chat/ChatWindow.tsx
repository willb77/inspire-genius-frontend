import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Upload, Send, Copy, Mic, Paperclip, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import ExportChatModal from "@/components/user/chat/ExportChatModal";
import DocumentsPanel from "@/components/user/chat/DocumentsPanel";
import DocumentViewerModal from "@/components/user/chat/DocumentViewerModal";
import type { ChatWindowProps, SimpleDoc, DocumentRef, ChatMessage } from "@/types/chat";

export default function ChatWindow({ coachName, className, onBack, onSendText, onToggleRecording, isRecording, onDocumentsSelectionChange, hasAudio, isAudioPaused, onToggleAudioPlayback }: ChatWindowProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "documents">("chat");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string }>({ url: "", name: "" });
  const [exportOpen, setExportOpen] = useState(false);
  const onImportDocs = (items: SimpleDoc[]) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const toAdd = items.map((d, idx) => ({
      id: `m-imp-${Date.now()}-${idx}`,
      kind: "doc" as const,
      direction: "out" as const,
      docName: d.name,
      docKind: d.kind,
      time: timeStr,
    }));
    setMessages((prev) => [...prev, ...toAdd]);
    setActiveTab("chat");
  };
  const onPreview = (item: DocumentRef) => {
    if (!item.url) return;
    setViewer({ url: item.url, name: item.name });
    setViewerOpen(true);
  };

  // Chat messages state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "msg1", kind: "text", direction: "out", text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.", time: "11:14 pm" },
    { id: "msg2", kind: "text", direction: "in", text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type", time: "11:14 pm" },
    { id: "msg3", kind: "doc", direction: "out", docName: "Document.pdf", docKind: "pdf", time: "09:25 AM" },
  ]);

  const [inputText, setInputText] = useState("");
  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    onSendText?.(text);
    setInputText("");
  };

  return (
    <div className={cn("relative bg-white rounded-2xl border shadow-sm flex flex-col h-[calc(100vh-5rem)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button aria-label="Back" onClick={onBack} className="p-1 rounded-md hover:bg-gray-100">
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-base font-semibold">{coachName}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <button
              className={cn(
                "px-2 py-1 border-b-2 text-sm",
                activeTab === "chat" ? "border-blue-primary text-foreground" : "border-transparent text-muted-foreground"
              )}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </button>
            <button
              className={cn(
                "px-2 py-1 border-b-2 text-sm",
                activeTab === "documents" ? "border-blue-primary text-foreground" : "border-transparent text-muted-foreground"
              )}
              onClick={() => setActiveTab("documents")}
            >
              Documents
            </button>
          </div>
          <Button className="bg-brown-250 hover:bg-brown-250/90 text-white h-9 px-3 rounded-lg" variant="secondary" onClick={() => setExportOpen(true)}>
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
      >
        {activeTab === "chat" ? (
          <div className="space-y-6">
            {messages.map((m) => {
              if (m.kind === "text") {
                const right = m.direction === "out";
                return (
                  <div key={m.id} className="space-y-1">
                    <div className={cn("max-w-[70%] rounded-2xl p-3 text-sm text-foreground/90 shadow-sm", right ? "ml-auto bg-gray-100" : "bg-gray-100")}>
                      {m.text}
                    </div>
                    <div className={cn("max-w-[70%] flex items-center justify-between mt-2 px-2", right ? "ml-auto" : undefined)}>
                      <button aria-label="Copy message" type="button" className="text-muted-foreground/60 hover:text-foreground">
                        <Copy className="size-4 text-black" />
                      </button>
                      <div className="text-xs text-muted-foreground">{m.time}</div>
                    </div>
                  </div>
                );
              }
              // doc bubble
              const right = m.direction === "out";
              return (
                <div key={m.id} className="space-y-1">
                  <div className={cn("max-w-[70%] border rounded-2xl p-3 text-sm shadow-sm bg-white", right ? "ml-auto" : undefined)}>
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                        m.docKind === "pdf" ? "bg-red-50 text-red-600" :
                        m.docKind === "csv" ? "bg-green-50 text-green-600" :
                        m.docKind === "ppt" ? "bg-orange-50 text-orange-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        {m.docKind.toUpperCase()}
                      </span>
                      <span className="truncate">{m.docName}</span>
                    </div>
                  </div>
                  <div className={cn("max-w-[70%] flex items-center justify-between mt-2 px-2", right ? "ml-auto" : undefined)}>
                    <button aria-label="Copy message" type="button" className="text-muted-foreground/60 hover:text-foreground">
                      <Copy className="size-4 text-black" />
                    </button>
                    <div className="text-xs text-muted-foreground">{m.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <DocumentsPanel onImportToChat={onImportDocs} onPreview={onPreview} onSelectionChange={onDocumentsSelectionChange} />
        )}
      </div>

      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        fileUrl={viewer.url}
        fileName={viewer.name}
        onDelete={() => setViewerOpen(false)}
        onDownload={() => {
          const a = document.createElement("a");
          a.href = viewer.url;
          a.download = viewer.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }}
      />

      {/* Export chat modal */}
      <ExportChatModal open={exportOpen} onOpenChange={setExportOpen} />

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
              disabled={true}
              onClick={() => onToggleRecording?.()}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              aria-pressed={!!isRecording}
              className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center"
            >
              <Mic className={cn("size-5", isRecording ? "text-red-600 animate-pulse" : "text-muted-foreground")} />
            </button>
            <Input
              placeholder="Ask Anything...."
              className="h-11 pl-10 pr-10 rounded-xl bg-gray-100"
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
            <Paperclip className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          </div>
          
          {hasAudio && onToggleAudioPlayback ? (
            <Button disabled={true} type="button" onClick={onToggleAudioPlayback} variant="secondary" className="h-11 px-3">
              {isAudioPaused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </Button>
          ) : null}
          <Button disabled={true} className="bg-blue-primary hover:bg-blue-primary/90 h-11 px-3" onClick={handleSend}>
            <Send className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
