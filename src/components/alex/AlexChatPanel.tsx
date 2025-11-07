"use client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Send,
  Mic,
  Settings,
  FileUp,
  Pause,
  Play,
  Loader2,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTour } from "@/context/useTour";
import { useRef, useCallback, useEffect, useState } from "react";
import { useAlexWebSocket } from "@/components/alex-voice-assistant/useAlexWebSocket";
import type { AlexResponse } from "@/components/alex-voice-assistant/types/types";
import type { ChatMessage } from "@/components/alex-voice-assistant/types/types";
import DemoAudioService from "@/services/demoAudioService";
import EmptyStateCard from "@/components/alex/EmptyStateCard";
import ExportChatModal from "@/components/user/chat/ExportChatModal";
import { useAlexDeviceId, useAlexHistoryListOnce } from "@/hooks/alex/useAlexChat";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadAlexChat } from "@/services/alex/chat.service";
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown";

export type AlexChatPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

export default function AlexChatPanel({
  open,
  onOpenChange,
  className,
}: AlexChatPanelProps) {
  const { start } = useTour();
  const [message, setMessage] = useState("");
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const demoAudioServiceRef = useRef<DemoAudioService | null>(null);
  if (!demoAudioServiceRef.current)
    demoAudioServiceRef.current = new DemoAudioService();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastMessageRef = useRef<{ type: string; text: string }>({
    type: "",
    text: "",
  });
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Alex APIs: device id + export
  const { data: deviceResp } = useAlexDeviceId(true);
  const deviceKey = (deviceResp?.device_id || "").toString();
  const historyMutation = useAlexHistoryListOnce();

  type AlexHistoryParty = { content?: string; created_at?: string } | undefined;
  type AlexHistoryItem = {
    sequence?: number;
    user?: AlexHistoryParty;
    assistant?: AlexHistoryParty;
  };

  const handleLoadHistory = useCallback(async () => {
    if (!deviceKey) {
      toast.error("Alex device id not available");
      return;
    }
    try {
      const resp = await historyMutation.mutateAsync({
        limit: 100,
        offset: 0,
        device_key: deviceKey,
      });

      const list = (resp?.data?.history ??
        resp?.history ??
        []) as AlexHistoryItem[];
      if (Array.isArray(list) && list.length) {
        const mapped: ChatMessage[] = [];
        for (const item of list) {
          const u = item?.user;
          const a = item?.assistant;
          if (u && typeof u.content === "string") {
            mapped.push({
              id: `hist-u-${item.sequence ?? Date.now()}-${mapped.length}`,
              text: u.content,
              sender: "user",
              timestamp: new Date(u.created_at || Date.now()),
            });
          }
          if (a && typeof a.content === "string") {
            mapped.push({
              id: `hist-a-${item.sequence ?? Date.now()}-${mapped.length}`,
              text: a.content,
              sender: "assistant",
              timestamp: new Date(a.created_at || Date.now()),
            });
          }
        }
        setMessages((prev) => [...prev, ...mapped.reverse()]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load history");
    }
  }, [deviceKey, historyMutation]);

  const handleOpenExport = useCallback(() => {
    setExportOpen(true);
  }, []);

  const handleExportChat = useCallback(async (fromDate: Date, toDate: Date) => {
    if (!deviceKey) {
      toast.error("Alex device id not available");
      return;
    }
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    try {
      const resp = await downloadAlexChat({
        device_key: deviceKey,
        start_date: fmt(fromDate),
        end_date: fmt(toDate),
        limit: 100,
        offset: 0,
      });
   if (!resp || !resp.status) return;

      const base64 = resp.base64_pdf || resp.base64_csv;
      const mime = resp.mime_type || "application/pdf";
      const fileName = resp.file_name || `alex-chat-${fmt(fromDate)}-to-${fmt(toDate)}.pdf`;
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
  }, [deviceKey]);

  // Smoothly scroll to bottom when messages change or history finishes loading
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, historyMutation.isPending]);

  const onResponse = useCallback((response: AlexResponse) => {
 
    if (response.type === "continuous_mode") {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          text: "",
          sender: "assistant",
          timestamp: new Date(),
          isProcessing: true,
          type: "processing",
        },
      ]);
    }

    if (response.type === "audio_start") {
      demoAudioServiceRef.current?.resetAudioState();
      setHasAudio(true);
      return;
    }
    if (response.type === "transcript") {
      const text = response.text ?? "";
      if (!text) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          text,
          sender: "user",
          timestamp: new Date(),
        },
      ]);
      lastMessageRef.current = { type: "transcript", text };
      return;
    }
    if (response.type === "response_chunk") {
      setMessages((prev) => prev.filter((m) => m.type !== "processing"));
      const text = response.full_text ?? response.text ?? "";
      if (!text) return;
      if (
        lastMessageRef.current.type !== "response_chunk" ||
        lastMessageRef.current.text !== text
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            text,
            sender: "assistant",
            timestamp: new Date(),
          },
        ]);
        lastMessageRef.current = { type: "response_chunk", text };
      }
      return;
    }
    if (response.type === "response") {
      const text = response.text ?? "";
      if (!text) return;
      // setMessages((prev) => ([...prev, { id: `msg-${Date.now()}`, text, sender: "bot", timestamp: new Date() }]));
      lastMessageRef.current = { type: "response", text };
      return;
    }
    if (response.type === "error") {
      const text = response.message ?? "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          text: `Error: ${text}`,
          sender: "system",
          timestamp: new Date(),
        },
      ]);
      lastMessageRef.current = { type: "error", text };
      return;
    }
    // if (response.type === "audio_complete") {
    //   return;
    // }
  }, []);

  const onAudioData = useCallback(
    (audioData: ArrayBuffer) => {
      const svc = demoAudioServiceRef.current;
      if (!svc) return;
      svc.initializeAudioContext().then(() => {
        svc.addAudioChunk(audioData);
        setHasAudio(true);
        if (isAudioPaused) {
          svc.resumeAudio();
          setIsAudioPaused(false);
        }
      });
    },
    [isAudioPaused]
  );

  const {
    isConnected,
    isConnecting,
    connect,
    sendTextMessage,
    startContinuousMode,
    isRecording,
    startRecording,
    stopRecording,
    updateContinuousMute,
  } = useAlexWebSocket(onResponse, onAudioData);

  const toggleRecording = useCallback(async () => {
    if (!isConnected) {
      connect();
      return;
    }
    if (!isRecording) {
      startContinuousMode();
      await startRecording();
    } else {
      stopRecording();
    }
  }, [
    isConnected,
    connect,
    isRecording,
    startContinuousMode,
    startRecording,
    stopRecording,
  ]);

  const handleSend = useCallback(() => {
    const text = message.trim();
    if (!text || !isConnected) return;
    demoAudioServiceRef.current?.resetAudioState();
    setHasAudio(false);
    sendTextMessage(text);
    setMessage("");
    setIsAudioPaused(false);
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, text, sender: "user", timestamp: new Date(), },
      { id: `msg-${Date.now()}`, text: "", sender: "assistant", timestamp: new Date(), isProcessing: true, type: "processing" },
    ]);
  }, [message, isConnected, sendTextMessage]);

  const toggleAudioPlayback = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (!isConnected && open) {
      connect();
      
    }
    if (isConnected && open) {
      updateContinuousMute(false);
    }
    // do not add connect/disconnect to deps to avoid re-creating
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isConnected]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          // base sizing
          "p-0 mt-4 w-full h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-md [&>button]:hidden",
          // add spacing and rounded edge on >= sm screens
          "sm:right-4 sm:inset-y-4 sm:rounded-l-xl sm:shadow-xl sm:border",
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-base font-semibold">Chat with Alex</div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0"
                    aria-label="Load chat history"
                    onClick={handleLoadHistory}
                    disabled={historyMutation.isPending}
                  >
                    {historyMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Load chat history</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    disabled={true}
                    className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0"
                    aria-label="Settings"
                  >
                    <Settings className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Settings</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    onClick={handleOpenExport}
                    disabled={false}
                    className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0"
                    aria-label="Export chat"
                  >
                    <FileUp className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Export chat</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="grid place-items-center rounded-full bg-blue-primary/10 text-blue-primary size-8"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        {historyMutation.isPending ? (
          <div className="px-4">
            {[0, 1, 2,3].map((i) => (
              <div
                key={`sk-${i}`}
                className={i % 2 === 0 ? "text-left" : "text-right"}
              >
                <div className="inline-flex px-3 py-2 rounded-md">
                  <Skeleton className="h-6 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {messages.length === 0 && !historyMutation.isPending && (
          <div className="px-4">
            <EmptyStateCard onStart={start} />
          </div>
        )}
        {messages.length > 0 && !historyMutation.isPending && (
          <div className={`px-4 ${messages.length === 0 ? "mt-16" : ""}`}>
            {/* space for callouts overlay */}
            <div className="h-[58vh] overflow-y-auto space-y-2 rounded-md px-3 bg-white">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={m.sender === "user" ? "text-right" : "text-left"}
                >
                  {m.sender === "assistant" && m.type === "processing" ? (
                    <div
                      className={`inline-flex items-end gap-1 px-3 py-2 rounded-md text-sm bg-gray-100 text-gray-900`}
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-3 rounded-full bg-gray-600/70"
                          animate={{
                            height: [8, 14, 8],
                            opacity: [0.6, 1, 0.6],
                          }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.12,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`inline-block px-3 py-2 rounded-md text-sm ${
                        m.sender === "user"
                          ? "bg-blue-50 text-blue-900"
                          : m.sender === "assistant"
                          ? "bg-gray-100 text-gray-900"
                          : "bg-yellow-50 text-yellow-800"
                      }`}
                    >
                      {m.sender === "assistant" ? (
                        <AssistantMarkdown text={m.text} className="text-left" />
                      ) : (
                        m.text
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        <div className="p-4 border-t mt-auto">
          <div className="relative flex items-center justify-between gap-2">
            <button
              aria-label="Toggle recording"
              onClick={toggleRecording}
              disabled={false}
              className={`absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center`}
              title={
                isRecording
                  ? "Recording… click to stop"
                  : "Click to start recording"
              }
            >
              <Mic
                className={`size-5 ${
                  isRecording
                    ? "text-red-600 animate-pulse"
                    : "text-muted-foreground"
                }`}
              />
            </button>
            <Input
              placeholder={
                isRecording
                  ? ""
                  : isConnected
                  ? "Ask Anything...."
                  : isConnecting
                  ? "Connecting to Alex..."
                  : "Alex is offline"
              }
              className="h-11 !pl-10"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!isConnected}
            />
            {isRecording && (
              <div className="pointer-events-none absolute left-10 right-28 top-1/2 -translate-y-1/2 flex items-end gap-1 h-5">
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
            )}
            {hasAudio && (
              <Button
                type="button"
                onClick={toggleAudioPlayback}
                disabled={false}
                variant="secondary"
                className="h-11 px-3"
              >
                {isAudioPaused ? (
                  <Play className="size-5" />
                ) : (
                  <Pause className="size-5" />
                )}
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 px-3"
                    onClick={() => {
                      if (hasAudio && !isAudioPaused) return; // disabled while audio is actively playing
                      const next = !isMuted;
                      setIsMuted(next);
                      if (isConnected) updateContinuousMute(next);
                    }}
                    disabled={hasAudio && !isAudioPaused}
                    aria-label={isMuted ? "Unmute Alex" : "Mute Alex"}
                  >
                    {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {hasAudio && !isAudioPaused ? (
                    <span className="text-xs">Mute is disabled during playback</span>
                  ) : isMuted ? (
                    <span className="text-xs">Unmute</span>
                  ) : (
                    <span className="text-xs">Mute</span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              type="button"
              onClick={handleSend}
              disabled={!isConnected || !message.trim()}
              className="h-11 px-3 bg-blue-primary hover:bg-blue-primary/90"
            >
              <Send className="size-5" />
            </Button>
          </div>
        </div>
      </SheetContent>
      <ExportChatModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        onExport={handleExportChat}
      />
    </Sheet>
  );
}
