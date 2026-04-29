import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAgentEngine } from "@/lib/agentApi";

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
  connect: (
    agentId: string,
    accessToken: string,
    fileIds?: string[],
    conversationId?: string,
    /** Path 4: file_ids to force-load as FULL TEXT into the system prompt. Use for two-document comparison demos. */
    forceFullTextFileIds?: string[],
  ) => void;
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

  const pendingInitRef = useRef<{ agentId: string; token: string; fileIds?: string[]; conversationId?: string; forceFullTextFileIds?: string[] } | null>(null);
  const activeAgentIdRef = useRef<string | null>(null);
  const activeTokenRef = useRef<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const agentEngineOn = useAgentEngine();
  const wsProxyBase = (import.meta.env.VITE_AGENTS_WEBSOCKET_BASE_URL as string) || "";

  const makeUrl = useCallback((agentId: string, accessToken?: string) => {
    // Local dev: connect directly to the monolith WS endpoint
    if (wsProxyBase.includes("localhost") || wsProxyBase.includes("127.0.0.1")) {
      return `${wsProxyBase.replace(/\/$/, "")}/agents/${agentId}`;
    }

    // Production: route based on agent engine toggle
    if (!agentEngineOn) {
      // Monolith path: connect via CloudFront → monolith origin.
      // Use /v1/ws/agents/* (not /v1/agents/ws/*) — the latter matches the
      // CloudFront /v1/agents/* behavior which targets API Gateway, while
      // /v1/ws/agents/* falls through to the default origin (EC2 monolith).
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "";
      const wsBase = apiBase.replace(/^http/, "ws").replace(/\/$/, "");
      const url = `${wsBase}/v1/ws/agents/${agentId}`;
      if (accessToken) {
        return `${url}?access-token=${encodeURIComponent(accessToken)}`;
      }
      return url;
    }

    // Ecosystem path: connect to ws-proxy (API Gateway WebSocket API)
    const url = wsProxyBase.replace(/\/$/, "");
    if (accessToken) {
      return `${url}${url.includes("?") ? "&" : "?"}access-token=${encodeURIComponent(accessToken)}`;
    }
    return url;
  }, [wsProxyBase, agentEngineOn]);

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
      // Include token for late-auth (ws-proxy pending_auth connections)
      access_token: activeTokenRef.current ?? undefined,
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

  const sendInit = useCallback((token: string, conversationId?: string, fileIds?: string[], agentId?: string, forceFullTextFileIds?: string[]) => {
    const payload = {
      type: "init",
      action: "chat",
      access_token: token,
      agent_id: agentId,
      conversation_id: conversationId,
      file_ids: fileIds && fileIds.length ? fileIds : undefined,
      // Path 4: force-load these files as FULL TEXT (not RAG-retrieved chunks).
      // Used for two-document comparison and similar analysis tasks where top-k
      // retrieval cannot guarantee both docs contribute to context.
      force_full_text_file_ids:
        forceFullTextFileIds && forceFullTextFileIds.length ? forceFullTextFileIds : undefined,
      mute: false,
    };
    safeSend(JSON.stringify(payload));
  }, [safeSend]);

  const connect = useCallback((agentId: string, accessToken: string, fileIds?: string[], conversationId?: string, forceFullTextFileIds?: string[]) => {
    // Require a conversation id to initiate
    if (!conversationId) {
      return;
    }
    const prev = pendingInitRef.current;
    pendingInitRef.current = { agentId, token: accessToken, fileIds, conversationId, forceFullTextFileIds };

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
    const url = makeUrl(agentId, accessToken);
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
      if (p) sendInit(p.token, p.conversationId, p.fileIds, p.agentId, p.forceFullTextFileIds);
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
          connect(p.agentId, p.token, p.fileIds, p.conversationId, p.forceFullTextFileIds);
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
