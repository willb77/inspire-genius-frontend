import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AgentIncomingType =
  | "init_success"
  | "init_error"
  | "auth_error"
  | "processing"
  | "transcript"
  | "response_chunk"
  | "response"
  | "audio_start"
  | "audio_complete"
  | "continuous_mode"
  | "error";

export type AgentResponse = {
  type: AgentIncomingType;
  message?: string;
  text?: string;
  full_text?: string;
  format?: string;
  status?: string;
};

export interface UsePrismAgentWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  isProcessing: boolean;
  transcript: string;
  currentResponse: string;
  connect: (agentId: string, accessToken: string, fileIds?: string[], conversationId?: string) => void;
  disconnect: () => void;
  sendTextMessage: (text: string, isRealtime?: boolean) => void;
  startAudioInput: () => void;
  sendAudioChunk: (chunk: ArrayBuffer | Blob) => void;
  endAudioInput: () => void;
  updateSelectedFiles: (fileIds: string[]) => void;
  updateContinuousMute: (mute: boolean) => void;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function usePrismAgentWebSocket(
  onResponse?: (r: AgentResponse) => void,
  onAudioData?: (audioData: ArrayBuffer) => void
): UsePrismAgentWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const pendingInitRef = useRef<{ agentId: string; token: string; fileIds?: string[]; conversationId?: string } | null>(null);
  const activeAgentIdRef = useRef<string | null>(null);
  const activeTokenRef = useRef<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const base = (import.meta.env.VITE_AGENTS_WEBSOCKET_BASE_URL as string) || "";

  const makeUrl = useCallback((agentId: string) => {
    const trimmed = base.replace(/\/$/, "");
    // API Gateway WebSocket API uses route selection from message body, not URL paths.
    // For local dev (ws://localhost:8001), append /agents/{agentId} as the monolith expects.
    // For production (wss://*.execute-api.*), connect to the base URL directly and
    // send the agent_id in the init message payload.
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      return `${trimmed}/agents/${agentId}`;
    }
    // Production: connect to base WSS URL (API Gateway ignores URL path segments)
    return trimmed;
  }, [base]);

  const safeSend = useCallback((data: string | ArrayBuffer | Blob) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(data);
  }, []);

  const sendTextMessage = useCallback((text: string, isRealtime = false) => {
    const payload = {
      type: isRealtime ? "realtime_text" : "text",
      action: "chat",
      text,
      message: text,
    };
    safeSend(JSON.stringify(payload));
  }, [safeSend]);

  const startAudioInput = useCallback(() => {
    safeSend(JSON.stringify({ type: "start_continuous" }));
  }, [safeSend]);

  const sendAudioChunk = useCallback((chunk: ArrayBuffer | Blob) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(chunk);
  }, []);

  const endAudioInput = useCallback(() => {
    safeSend(JSON.stringify({ type: "audio_end" }));
  }, [safeSend]);

  const updateContinuousMute = useCallback((mute: boolean) => {
    safeSend(JSON.stringify({ type: "start_continuous", mute }));
  }, [safeSend]);

  const handleIncoming = useCallback((event: MessageEvent) => {
    if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
      if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buf) => { if (onAudioData) onAudioData(buf); });
      } else if (onAudioData) {
        onAudioData(event.data);
      }
      return;
    }
    try {
      const msg: AgentResponse = JSON.parse(event.data);
      if (msg.type === "processing") setIsProcessing(true);
      if (msg.type === "transcript" && msg.text) setTranscript(msg.text);
      if (msg.type === "response_chunk" && msg.text) setCurrentResponse((p) => p + msg.text);
      if (msg.type === "response" && (msg.text || msg.full_text)) {
        setCurrentResponse(msg.full_text || msg.text || "");
        setIsProcessing(false);
      }
      if (msg.type === "error" || msg.type === "auth_error" || msg.type === "init_error") {
        setError(msg.message || "Agent error");
        setIsProcessing(false);
      }
      if (onResponse) onResponse(msg);
    } catch {
      setError("Failed to parse server response");
    }
  }, [onResponse, onAudioData]);

  const cleanupReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const disconnect = useCallback(() => {
    cleanupReconnectTimer();
    const ws = socketRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try { ws.close(); } catch {
        console.error("Failed to close WebSocket");
      }
    }
    socketRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    activeAgentIdRef.current = null;
    activeTokenRef.current = null;
  }, []);

  const sendInit = useCallback((token: string, conversationId?: string, fileIds?: string[], agentId?: string) => {
    const payload = {
      type: "init",
      action: "chat",
      access_token: token,
      agent_id: agentId,
      conversation_id: conversationId,
      file_ids: fileIds && fileIds.length ? fileIds : undefined,
      mute: false,
    };
    safeSend(JSON.stringify(payload));
  }, [safeSend]);

  const connect = useCallback((agentId: string, accessToken: string, fileIds?: string[], conversationId?: string) => {
    // Require a conversation id to initiate
    if (!conversationId) {
      return;
    }
    const prev = pendingInitRef.current;
    pendingInitRef.current = { agentId, token: accessToken, fileIds, conversationId };

    // If there is an existing or in-flight connection, but target agent/token changed, reconnect
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      const sameAgent = activeAgentIdRef.current === agentId;
      const sameToken = activeTokenRef.current === accessToken;
      const sameConv = prev?.conversationId === conversationId;
      if (sameAgent && sameToken && sameConv) {
        return; // no-op
      }
      // Different agent, token, or conversation: reconnect with new params
      disconnect();
    }
    const url = makeUrl(agentId);
    setIsConnecting(true);
    setError(null);

    const ws = new WebSocket(url);
    socketRef.current = ws;
    activeAgentIdRef.current = agentId;
    activeTokenRef.current = accessToken;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttempts.current = 0;
      const p = pendingInitRef.current;
      if (p) sendInit(p.token, p.conversationId, p.fileIds, p.agentId);
    };

    ws.onmessage = handleIncoming;

    ws.onerror = () => {
      setError("WebSocket error");
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      if (reconnectAttempts.current < maxReconnectAttempts && pendingInitRef.current) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectAttempts.current += 1;
        cleanupReconnectTimer();
        reconnectTimeoutRef.current = setTimeout(() => {
          const p = pendingInitRef.current!;
          connect(p.agentId, p.token, p.fileIds, p.conversationId);
        }, delay);
      }
    };
  }, [disconnect, makeUrl, sendInit, handleIncoming]);

  const updateSelectedFiles = useCallback((fileIds: string[]) => {
    const p = pendingInitRef.current;
    if (!p) return;
    // Update the pending init payload so the next init includes latest file ids (covers CONNECTING state)
    pendingInitRef.current = { ...p, fileIds };
    // If socket is already open, immediately re-init with latest file ids so backend receives them
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const token = activeTokenRef.current || p.token;
      sendInit(token, p.conversationId, fileIds, p.agentId);
    }
  }, [sendInit]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data && e.data.size) sendAudioChunk(e.data); };
      mr.onstart = () => { setIsRecording(true); startAudioInput(); };
      mr.onstop = () => { setIsRecording(false); endAudioInput(); };
      mr.start(250);
    } catch {
      setError('Microphone access denied');
    }
  }, [isRecording, sendAudioChunk, startAudioInput, endAudioInput]);

  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
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

  useEffect(() => {
    return () => {
      stopRecording();
      disconnect();
    };
  }, [disconnect, stopRecording]);

  return useMemo(() => ({
    isConnected,
    isConnecting,
    error,
    isProcessing,
    transcript,
    currentResponse,
    connect,
    disconnect,
    sendTextMessage,
    startAudioInput,
    sendAudioChunk,
    endAudioInput,
    updateSelectedFiles,
    updateContinuousMute,
    isRecording,
    startRecording,
    stopRecording,
  }), [
    isConnected,
    isConnecting,
    error,
    isProcessing,
    transcript,
    currentResponse,
    connect,
    disconnect,
    sendTextMessage,
    startAudioInput,
    sendAudioChunk,
    endAudioInput,
    updateSelectedFiles,
    updateContinuousMute,
    isRecording,
    startRecording,
    stopRecording,
  ]);
}
