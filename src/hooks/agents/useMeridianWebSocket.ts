import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MeridianMessageType = "connected" | "token" | "complete" | "error";

export type MeridianResponse = {
  type: MeridianMessageType;
  content?: string;
  message?: string;
  agent?: string;
  session_id?: string;
  user_id?: string;
  metadata?: {
    domain?: string;
    latency_ms?: number;
    ttft_ms?: number;
    token_count?: number;
    rag_sources?: { filename: string; similarity: number }[];
    rag_chunks_retrieved?: number;
    rag_cache_hit?: boolean;
    rag_avg_similarity?: number;
  };
  observability?: Record<string, unknown>;
};

export type UseMeridianWebSocketReturn = {
  isConnected: boolean;
  isConnecting: boolean;
  isProcessing: boolean;
  error: string | null;
  serverSessionId: string | null;
  currentAgent: string | null;
  currentDomain: string | null;
  currentResponse: string;
  connect: (accessToken: string) => void;
  disconnect: () => void;
  sendMessage: (text: string, context?: Record<string, unknown>) => void;
  startVoice: (voiceConfig?: { gender?: string; accent?: string; language?: string }) => void;
  stopVoice: () => void;
  sendAudioChunk: (chunk: ArrayBuffer | Blob) => void;
  isRecording: boolean;
  startRecording: (voiceConfig?: { gender?: string; accent?: string; language?: string }) => Promise<void>;
  stopRecording: () => void;
};

export type UseMeridianWebSocketOptions = {
  onResponse?: (response: MeridianResponse) => void;
  onAudioData?: (data: ArrayBuffer) => void;
  maxReconnectAttempts?: number;
};

// ---------------------------------------------------------------------------
// Helper — build WebSocket URL
// ---------------------------------------------------------------------------

function buildWsUrl(accessToken: string): string {
  // Prefer dedicated WebSocket URL (API Gateway WebSocket API)
  const wsEnv =
    (import.meta.env.VITE_AGENT_WS_URL as string) ||
    (import.meta.env.VITE_AGENTS_WEBSOCKET_BASE_URL as string);

  if (wsEnv) {
    const base = wsEnv.replace(/\/$/, "");
    // API Gateway WebSocket API uses route selection from the message body
    // (action field), NOT URL paths. Do NOT append /ws/chat — it causes 403.
    // For local dev (direct ECS connection), append /ws/chat as the server expects it.
    const isApiGw = base.includes("execute-api") || base.includes("amazonaws.com");
    const url = isApiGw ? base : (base.includes("/ws/chat") ? base : `${base}/ws/chat`);
    return `${url}${url.includes("?") ? "&" : "?"}access-token=${encodeURIComponent(accessToken)}`;
  }

  // Fallback: derive from HTTP Agent Engine URL (works for local dev)
  const base =
    (import.meta.env.VITE_AGENT_ENGINE_URL as string) ||
    (import.meta.env.VITE_API_BASE_URL as string) ||
    "http://localhost:3000";
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase.replace(/\/$/, "")}/ws/chat?access-token=${encodeURIComponent(accessToken)}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMeridianWebSocket(
  options: UseMeridianWebSocketOptions = {},
): UseMeridianWebSocketReturn {
  const { onResponse, onAudioData, maxReconnectAttempts = 5 } = options;

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session / agent tracking
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState("");

  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const activeTokenRef = useRef<string | null>(null);

  // Audio recording refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Stable refs for callbacks to avoid stale closures in WS handlers
  const onResponseRef = useRef(onResponse);
  onResponseRef.current = onResponse;
  const onAudioDataRef = useRef(onAudioData);
  onAudioDataRef.current = onAudioData;

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  const cleanupReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const safeSend = useCallback((data: string | ArrayBuffer | Blob) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(data);
  }, []);

  // -------------------------------------------------------------------
  // Incoming message handler
  // -------------------------------------------------------------------

  const handleIncoming = useCallback((event: MessageEvent) => {
    // Binary data = audio
    if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
      if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buf) => {
          onAudioDataRef.current?.(buf);
        });
      } else {
        onAudioDataRef.current?.(event.data);
      }
      return;
    }

    try {
      const msg: MeridianResponse = JSON.parse(event.data);

      switch (msg.type) {
        case "connected":
          if (msg.session_id) setServerSessionId(msg.session_id);
          break;

        case "token":
          setIsProcessing(true);
          if (msg.content) setCurrentResponse((prev) => prev + msg.content);
          if (msg.agent) setCurrentAgent(msg.agent);
          break;

        case "complete":
          setCurrentResponse(msg.content ?? "");
          setIsProcessing(false);
          if (msg.agent) setCurrentAgent(msg.agent);
          if (msg.metadata?.domain) setCurrentDomain(msg.metadata.domain);
          if (msg.session_id) setServerSessionId(msg.session_id);
          break;

        case "error":
          setError(msg.message ?? "Agent error");
          setIsProcessing(false);
          break;
      }

      onResponseRef.current?.(msg);
    } catch {
      setError("Failed to parse server response");
    }
  }, []);

  // -------------------------------------------------------------------
  // Disconnect
  // -------------------------------------------------------------------

  const disconnect = useCallback(() => {
    cleanupReconnectTimer();
    const ws = socketRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
    socketRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    activeTokenRef.current = null;
  }, [cleanupReconnectTimer]);

  // -------------------------------------------------------------------
  // Connect
  // -------------------------------------------------------------------

  const connect = useCallback(
    (accessToken: string) => {
      // If already connected with the same token, no-op
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING) &&
        activeTokenRef.current === accessToken
      ) {
        return;
      }

      // Tear down any previous connection
      disconnect();

      const url = buildWsUrl(accessToken);
      setIsConnecting(true);
      setError(null);

      const ws = new WebSocket(url);
      socketRef.current = ws;
      activeTokenRef.current = accessToken;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = handleIncoming;

      ws.onerror = () => {
        setError("WebSocket error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        if (reconnectAttempts.current < maxReconnectAttempts && activeTokenRef.current) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectAttempts.current += 1;
          cleanupReconnectTimer();
          reconnectTimeoutRef.current = setTimeout(() => {
            const token = activeTokenRef.current;
            if (token) connect(token);
          }, delay);
        }
      };
    },
    [disconnect, handleIncoming, maxReconnectAttempts, cleanupReconnectTimer],
  );

  // -------------------------------------------------------------------
  // Send text message
  // -------------------------------------------------------------------

  const sendMessage = useCallback(
    (text: string, context?: Record<string, unknown>) => {
      setCurrentResponse("");
      setIsProcessing(true);
      safeSend(JSON.stringify({
        type: "chat",
        action: "chat",
        message: text,
        context,
        // Include token for late-auth (ws-proxy pending_auth connections)
        access_token: activeTokenRef.current ?? undefined,
      }));
    },
    [safeSend],
  );

  // -------------------------------------------------------------------
  // Voice helpers
  // -------------------------------------------------------------------

  const startVoice = useCallback((voiceConfig?: { gender?: string; accent?: string; language?: string }) => {
    safeSend(JSON.stringify({
      type: "voice_start",
      gender: voiceConfig?.gender,
      accent: voiceConfig?.accent,
      language: voiceConfig?.language ?? "en-US",
    }));
  }, [safeSend]);

  const stopVoice = useCallback(() => {
    safeSend(JSON.stringify({ type: "voice_stop" }));
  }, [safeSend]);

  const sendAudioChunk = useCallback(
    (chunk: ArrayBuffer | Blob) => {
      const ws = socketRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(chunk);
    },
    [],
  );

  // -------------------------------------------------------------------
  // MediaRecorder-based recording (mirrors usePrismAgentWebSocket)
  // -------------------------------------------------------------------

  const startRecording = useCallback(async (voiceConfig?: { gender?: string; accent?: string; language?: string }) => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) sendAudioChunk(e.data);
      };
      mr.onstart = () => {
        setIsRecording(true);
        startVoice(voiceConfig);
      };
      mr.onstop = () => {
        setIsRecording(false);
        stopVoice();
      };
      mr.start(250);
    } catch {
      setError("Microphone access denied");
    }
  }, [isRecording, sendAudioChunk, startVoice, stopVoice]);

  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } finally {
      mediaRecorderRef.current = null;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    }
  }, []);

  // -------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------

  useEffect(() => {
    return () => {
      stopRecording();
      disconnect();
    };
  }, [disconnect, stopRecording]);

  // -------------------------------------------------------------------
  // Return stable object
  // -------------------------------------------------------------------

  return useMemo(
    () => ({
      isConnected,
      isConnecting,
      isProcessing,
      error,
      serverSessionId,
      currentAgent,
      currentDomain,
      currentResponse,
      connect,
      disconnect,
      sendMessage,
      startVoice,
      stopVoice,
      sendAudioChunk,
      isRecording,
      startRecording,
      stopRecording,
    }),
    [
      isConnected,
      isConnecting,
      isProcessing,
      error,
      serverSessionId,
      currentAgent,
      currentDomain,
      currentResponse,
      connect,
      disconnect,
      sendMessage,
      startVoice,
      stopVoice,
      sendAudioChunk,
      isRecording,
      startRecording,
      stopRecording,
    ],
  );
}
