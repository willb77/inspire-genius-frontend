import UserLayout from "@/layouts/UserLayout";
import ChatHistory from "@/components/user/chat/ChatHistory";
import ChatWindow from "@/components/user/chat/ChatWindow";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { HistoryGroup } from "@/types/chat";
import { useAuth } from "@/context/useAuth";
import { usePrismAgentWebSocket } from "@/hooks/agents/usePrismAgentWebSocket";
import type { AgentResponse } from "@/hooks/agents/usePrismAgentWebSocket";
import DemoAudioService from "@/services/demoAudioService";

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
  const coachName = useMemo(() => titleCaseFromSlug(coach), [coach]);
  const agentId = coach; // param is the agent id
  const { user } = useAuth();
  const accessToken = user?.token ?? "";

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const demoAudioServiceRef = useRef<DemoAudioService | null>(null);
  if (!demoAudioServiceRef.current) demoAudioServiceRef.current = new DemoAudioService();
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const onResponse = useCallback((resp: AgentResponse) => {
    if (resp.type === "audio_start") {
      demoAudioServiceRef.current?.resetAudioState();
      setHasAudio(true);
      setIsAudioPaused(false);
    }
  }, []);

  const onAudioData = useCallback((audioData: ArrayBuffer) => {
    const svc = demoAudioServiceRef.current;
    if (!svc) return;
    svc.initializeAudioContext().then(() => {
      svc.addAudioChunk(audioData);
      setHasAudio(true);
      const ctx = svc.getAudioContext();
      if (ctx && ctx.state === "suspended") {
        svc.resumeAudio();
        setIsAudioPaused(false);
      }
    });
  }, []);

  const {
    connect,
    updateSelectedFiles,
    sendTextMessage,
    isConnected,
    isRecording,
    startRecording,
    stopRecording,
  } = usePrismAgentWebSocket(onResponse, onAudioData);

  useEffect(() => {
    if (!agentId || !accessToken) return;
    if (!isConnected) {
      connect(agentId, accessToken, selectedFileIds);
      return;
    }
    // already connected, apply file context updates
    updateSelectedFiles(selectedFileIds);
  }, [agentId, accessToken, selectedFileIds, isConnected, connect, updateSelectedFiles]);

  console.log("isRecording", isRecording);

  const [selectedId, setSelectedId] = useState<string | undefined>("1");

  const groups: HistoryGroup[] = [
    {
      label: "Today",
      items: [
        { id: "1", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "1 min ago" },
        { id: "2", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "10 mins ago" },
        { id: "3", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "24 mins ago" },
      ],
    },
    {
      label: "Yesterday",
      items: [
        { id: "4", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "10:17 PM" },
        { id: "5", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "8:53 PM" },
        { id: "6", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "7:30 PM" },
      ],
    },
  ];

  return (
    <UserLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 h-full" data-tour="chat-history">
          <ChatHistory
            groups={groups}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-8" data-tour="chat-window">
          <ChatWindow
            coachName={`${coachName} Coach`}
            onBack={() => navigate(-1)}
            onSendText={(t) => {
              demoAudioServiceRef.current?.resetAudioState();
              setHasAudio(false);
              setIsAudioPaused(false);
              sendTextMessage(t);
            }}
            onToggleRecording={() => (isRecording ? stopRecording() : startRecording())}
            isRecording={isRecording}
            onDocumentsSelectionChange={(ids) => setSelectedFileIds(ids)}
            hasAudio={hasAudio}
            isAudioPaused={isAudioPaused}
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
          />
        </div>
      </div>
    </UserLayout>
  );
}
