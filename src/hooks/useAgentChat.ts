import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { getToken } from "@/lib/storage";
import {
  agentChat,
  getAgentWebSocketUrl,
  type AgentChatRequest,
  type AgentChatResponse,
  type WsIncomingMessage,
  type WsOutgoingMessage,
} from "@/services/alex/agent.service";

// ─── Types ────────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  agent?: string;
  timestamp: number;
};

type UseAgentChatReturn = {
  /** Send a message via WebSocket (streaming) */
  sendMessage: (message: string, context?: Record<string, unknown>) => void;
  /** Send a message via REST (non-streaming) */
  sendMessageRest: (request: AgentChatRequest) => void;
  /** Current streaming content being received */
  streamingContent: string;
  /** Whether we are currently receiving a streaming response */
  isStreaming: boolean;
  /** Full conversation history */
  messages: ChatMessage[];
  /** WebSocket connection state */
  isConnected: boolean;
  /** Connect to the WebSocket */
  connect: () => Promise<void>;
  /** Disconnect from the WebSocket */
  disconnect: () => void;
  /** Current session ID */
  sessionId: string | null;
  /** Error message */
  error: string | null;
  /** Clear error */
  clearError: () => void;
  /** REST mutation state */
  isRestPending: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────

export function useAgentChat(): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const streamBufferRef = useRef("");
  const currentAgentRef = useRef("");
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // ─── WebSocket Connection ─────────────────────────────────────

  const connect = useCallback(async () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const token = await getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    const url = getAgentWebSocketUrl(token);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsIncomingMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "connected":
            setSessionId(msg.session_id);
            break;

          case "token":
            streamBufferRef.current += msg.content;
            currentAgentRef.current = msg.agent;
            setStreamingContent(streamBufferRef.current);
            setIsStreaming(true);
            break;

          case "complete":
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: msg.content,
                agent: msg.agent,
                timestamp: Date.now(),
              },
            ]);
            setSessionId(msg.session_id);
            streamBufferRef.current = "";
            currentAgentRef.current = "";
            setStreamingContent("");
            setIsStreaming(false);
            break;

          case "error":
            setError(msg.message);
            setIsStreaming(false);
            streamBufferRef.current = "";
            setStreamingContent("");
            break;
        }
      } catch {
        setError("Failed to parse server response");
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;

      // Auto-reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
        reconnectAttemptsRef.current += 1;
        setTimeout(() => connect(), delay);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
    };

    socketRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    socketRef.current?.close();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  // ─── Send via WebSocket (Streaming) ───────────────────────────

  const sendMessage = useCallback(
    (message: string, context?: Record<string, unknown>) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        setError("Not connected to agent");
        return;
      }

      // Add user message to history
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message, timestamp: Date.now() },
      ]);

      // Reset streaming state
      streamBufferRef.current = "";
      setStreamingContent("");
      setIsStreaming(true);

      const outgoing: WsOutgoingMessage = { type: "chat", message, context };
      socketRef.current.send(JSON.stringify(outgoing));
    },
    [],
  );

  // ─── Send via REST (Non-Streaming) ────────────────────────────

  const restMutation = useMutation({
    mutationFn: agentChat,
    onSuccess: (data: AgentChatResponse) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
          agent: data.agent,
          timestamp: Date.now(),
        },
      ]);
      setSessionId(data.session_id);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const sendMessageRest = useCallback(
    (request: AgentChatRequest) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: request.message, timestamp: Date.now() },
      ]);
      restMutation.mutate(request);
    },
    [restMutation],
  );

  // ─── Cleanup ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      reconnectAttemptsRef.current = maxReconnectAttempts;
      socketRef.current?.close();
    };
  }, []);

  return {
    sendMessage,
    sendMessageRest,
    streamingContent,
    isStreaming,
    messages,
    isConnected,
    connect,
    disconnect,
    sessionId,
    error,
    clearError: () => setError(null),
    isRestPending: restMutation.isPending,
  };
}
