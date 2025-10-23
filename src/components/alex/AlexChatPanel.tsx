"use client"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Send, Mic, Settings, FileUp, Download, Pause, Play } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTour } from "@/context/useTour"
import { useRef, useCallback, useEffect, useState } from "react"
import { useAlexWebSocket } from "@/components/alex-voice-assistant/useAlexWebSocket"
import type { AlexResponse } from "@/components/alex-voice-assistant/types/types"
import type { ChatMessage } from "@/components/alex-voice-assistant/types/types"
import DemoAudioService from "@/services/demoAudioService"
import EmptyStateCard from "@/components/alex/EmptyStateCard"

export type AlexChatPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

export default function AlexChatPanel({ open, onOpenChange, className }: AlexChatPanelProps) {
  const { start } = useTour();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const demoAudioServiceRef = useRef<DemoAudioService | null>(null);
  if (!demoAudioServiceRef.current) demoAudioServiceRef.current = new DemoAudioService();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastMessageRef = useRef<{ type: string; text: string }>({ type: "", text: "" });

  const onResponse = useCallback((response: AlexResponse) => {
    if (response.type === "continuous_mode") {
      setMessages((prev) => ([...prev, { id: `msg-${Date.now()}`, text: "", sender: 'bot', timestamp: new Date(), isProcessing: true, type: "processing" }]));
    }
 
    if (response.type === "audio_start") {
      demoAudioServiceRef.current?.resetAudioState();
      setHasAudio(true);
      return;
    }
    if (response.type === "transcript") {
      const text = response.text ?? "";
      if (!text) return;
      setMessages((prev) => ([...prev, { id: `msg-${Date.now()}`, text, sender: "user", timestamp: new Date() }]));
      lastMessageRef.current = { type: "transcript", text };
      return;
    }
    if (response.type === "response_chunk") {
            setMessages((prev) => prev.filter((m) => m.type !== 'processing'));
      const text = response.full_text ?? response.text ?? "";
      if (!text) return;
      if (lastMessageRef.current.type !== "response_chunk" || lastMessageRef.current.text !== text) {
        setMessages((prev) => ([...prev, { id: `msg-${Date.now()}`, text, sender: "bot", timestamp: new Date() }]));
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
      setMessages((prev) => ([...prev, { id: `msg-${Date.now()}`, text: `Error: ${text}` , sender: "system", timestamp: new Date() }]));
      lastMessageRef.current = { type: "error", text };
      return;
    }
    // if (response.type === "audio_complete") {
    //   return;
    // }
  }, []);
  

  const onAudioData = useCallback((audioData: ArrayBuffer) => {
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
  }, [isAudioPaused]);

  const { isConnected, isConnecting, connect, sendTextMessage, startContinuousMode, isRecording, startRecording, stopRecording } = useAlexWebSocket(onResponse, onAudioData);

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
  }, [isConnected, connect, isRecording, startContinuousMode, startRecording, stopRecording]);

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleSend = useCallback(() => {
    const text = message.trim();
    if (!text || !isConnected) return;
    demoAudioServiceRef.current?.resetAudioState();
    setHasAudio(false);
    sendTextMessage(text);
    setMessage("");
    setIsAudioPaused(false);
    setMessages((prev) => ([...prev, { id: `msg-${Date.now()}`, text, sender: "user", timestamp: new Date() }]));
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
            <Button variant="secondary" className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0" aria-label="Export">
              <Download className="size-4" />
            </Button>
            <Button variant="secondary" className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0" aria-label="Settings">
              <Settings className="size-4" />
            </Button>
            <Button variant="secondary" onClick={handleUploadClick} className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0" aria-label="Upload file">
              <FileUp className="size-4" />
            </Button>
            <button
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="grid place-items-center rounded-full bg-blue-primary/10 text-blue-primary size-8"
            >
              <X className="size-4" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" />
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="px-4">
            <EmptyStateCard onStart={start} />
          </div>
        ) : (
          <div className="px-4 mt-16">{/* space for callouts overlay */}
            <div className="h-[40vh] overflow-y-auto space-y-2 border rounded-md p-3 bg-white">
              {messages.map((m) => (
                <div key={m.id} className={m.sender === 'user' ? 'text-right' : 'text-left'}>
                  {m.sender === 'bot' && m.type === "processing" ? (
                    <div className={`inline-flex items-end gap-1 px-3 py-2 rounded-md text-sm bg-gray-100 text-gray-900`}>
                      {[0,1,2, 3, 4, 5].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-3 rounded-full bg-gray-600/70"
                          animate={{ height: [8, 14, 8], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={`inline-block px-3 py-2 rounded-md text-sm ${m.sender === 'user' ? 'bg-blue-50 text-blue-900' : m.sender === 'bot' ? 'bg-gray-100 text-gray-900' : 'bg-yellow-50 text-yellow-800'}`}>
                      {m.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t mt-auto">
          <div className="relative flex items-center justify-between gap-2">
          <button
              aria-label="Toggle recording"
              onClick={toggleRecording}
              className={`absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center`}
              title={isRecording ? 'Recording… click to stop' : 'Click to start recording'}
            >
              <Mic className={`size-5 ${isRecording ? 'text-red-600 animate-pulse' : 'text-muted-foreground'}`} />
            </button>
            <Input
              placeholder={isRecording ? '' : (isConnected ? "Ask Anything...." : (isConnecting ? "Connecting to Alex..." : "Alex is offline"))}
              className="h-11 !pl-10"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              disabled={!isConnected}
            />
            {isRecording && (
              <div className="pointer-events-none absolute left-10 right-28 top-1/2 -translate-y-1/2 flex items-end gap-1 h-5">
                {[0,1,2,3,4,5].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 rounded-full bg-blue-600/80"
                    initial={{ height: 6 }}
                    animate={{ height: [6, 18, 10, 22, 8, 16] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                  />
                ))}
              </div>
            )}
            {hasAudio && (
              <Button type="button" onClick={toggleAudioPlayback} variant="secondary" className="h-11 px-3">
                {isAudioPaused ? <Play className="size-5" /> : <Pause className="size-5" />}
              </Button>
            )}
            <Button type="button" onClick={handleSend} disabled={!isConnected || !message.trim()} className="h-11 px-3 bg-blue-primary hover:bg-blue-primary/90">
              <Send className="size-5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
