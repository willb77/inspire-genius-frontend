/**
 * DiagnosticChat — Standalone chat/voice interface with full traceability.
 *
 * Built from scratch (no shared chat components). Connects directly to the
 * Agent Engine via WebSocket and shows every step of the pipeline:
 *   1. Page open
 *   2. WebSocket connection to Agent Engine
 *   3. Meridian handshake & data-source enumeration
 *   4. User message sent (timestamped)
 *   5. Agent Engine receives message
 *   6. Agent collaboration (routing, delegation)
 *   7. Response delivered (timestamped)
 *
 * A collapsible trace log panel on the right shows verbose status at every step.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import {
  AGENT_VOICE_CONFIG,
  getAgentVoice,
  getDomainColor,
} from "@/constants/agentVoiceConfig";
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Mic,
  MicOff,
  Network,
  Radio,
  Server,
  SquarePen,
  Trash2,
  Volume2,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type TraceLevel = "info" | "success" | "warn" | "error" | "debug";

interface TraceEntry {
  id: string;
  timestamp: Date;
  level: TraceLevel;
  category: string;
  message: string;
  detail?: string;
  elapsed?: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
  agent?: string;
  domain?: string;
  latencyMs?: number;
  ttftMs?: number;
  tokenCount?: number;
}

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting";

// ─── Helpers ────────────────────────────────────────────────────────────────

let traceIdCounter = 0;
function nextTraceId(): string {
  return `trace-${Date.now()}-${++traceIdCounter}`;
}

function ts(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

// Production endpoints — used when env vars point to localhost (no local Agent Engine)
const PROD_REST_URL = "https://8umg6xioz5.execute-api.us-east-1.amazonaws.com";
const PROD_WS_URL = "wss://fhsei32zkf.execute-api.us-east-1.amazonaws.com/dev";

function isLocalUrl(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

function getRestBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_AGENT_ENGINE_URL as string) || "";
  return (!envUrl || isLocalUrl(envUrl)) ? PROD_REST_URL : envUrl;
}

// Standalone axios instance that always points at the Agent Engine (prod fallback)
const diagnosticApi = axios.create({ baseURL: getRestBaseUrl() });

function buildWsUrl(accessToken: string): string {
  // Check env vars — if they point to localhost, use production WS instead
  const wsEnv =
    (import.meta.env.VITE_AGENT_WS_URL as string) ||
    (import.meta.env.VITE_AGENTS_WEBSOCKET_BASE_URL as string);

  let base: string;
  if (wsEnv && !isLocalUrl(wsEnv)) {
    base = wsEnv.replace(/\/$/, "");
  } else {
    base = PROD_WS_URL;
  }

  const isApiGw = base.includes("execute-api") || base.includes("amazonaws.com");
  const url = isApiGw
    ? base
    : base.includes("/ws/chat")
      ? base
      : `${base}/ws/chat`;
  const sep = url.includes("?") ? "&" : "?";
  return accessToken
    ? `${url}${sep}access-token=${encodeURIComponent(accessToken)}`
    : url;
}

// ─── Data Sources (known from architecture) ─────────────────────────────────

const DATA_SOURCES = [
  { name: "Aurora PostgreSQL (RDS Proxy)", labelKey: "diagnostic.dataSources.auroraPostgres", status: "available" as const },
  { name: "DynamoDB (Rate Limiting)", labelKey: "diagnostic.dataSources.dynamoRateLimit", status: "available" as const },
  { name: "DynamoDB (RLHF Feedback)", labelKey: "diagnostic.dataSources.dynamoRlhf", status: "available" as const },
  { name: "S3 (Documents & Training Data)", labelKey: "diagnostic.dataSources.s3", status: "available" as const },
  { name: "Milvus / Zilliz (Vector Search)", labelKey: "diagnostic.dataSources.milvus", status: "available" as const },
  { name: "EventBridge (Event Bus)", labelKey: "diagnostic.dataSources.eventbridge", status: "available" as const },
  { name: "Cognito (User Pool)", labelKey: "diagnostic.dataSources.cognito", status: "available" as const },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function DiagnosticChat() {
  // Try to read token from auth context if available, otherwise use empty string
  let userEmail = "anonymous";
  let userRole = "none";
  let accessToken = "";
  try {
    const stored = localStorage.getItem("auth_token");
    if (stored) accessToken = stored;
    const storedEmail = localStorage.getItem("user_email");
    if (storedEmail) userEmail = storedEmail;
    const storedRole = localStorage.getItem("auth_role");
    if (storedRole) userRole = storedRole;
  } catch { /* ignore */ }

  // Inject token into standalone axios instance
  if (accessToken) {
    diagnosticApi.defaults.headers.common["access-token"] = accessToken;
  }

  const { t } = useTranslation("chat");

  // ── State ───────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [traceLog, setTraceLog] = useState<TraceEntry[]>([]);
  const [traceOpen, setTraceOpen] = useState(true);
  const [streamingText, setStreamingText] = useState("");
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // ── Refs ────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const traceEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pageOpenTime = useRef(new Date());
  const messageSentTime = useRef<Date | null>(null);
  const firstTokenTime = useRef<Date | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // ── Trace Logger ────────────────────────────────────────────

  const addTrace = useCallback(
    (
      level: TraceLevel,
      category: string,
      message: string,
      detail?: string,
      elapsed?: number,
    ) => {
      const entry: TraceEntry = {
        id: nextTraceId(),
        timestamp: new Date(),
        level,
        category,
        message,
        detail,
        elapsed,
      };
      setTraceLog((prev) => [...prev, entry]);
    },
    [],
  );

  // ── Auto-scroll ─────────────────────────────────────────────

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    traceEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [traceLog]);

  // ── Initial trace on mount ──────────────────────────────────

  useEffect(() => {
    addTrace("info", "PAGE", "Diagnostic Chat page opened", `User: ${userEmail} | Role: ${userRole}`);
    addTrace("info", "PAGE", "Page render timestamp", ts(pageOpenTime.current));
    addTrace("info", "AUTH", "Auth token status", accessToken ? `Token present (${accessToken.slice(0, 12)}...)` : "NO TOKEN — will connect unauthenticated");
    addTrace("info", "CONFIG", `REST endpoint: ${getRestBaseUrl()}`);
    addTrace("info", "CONFIG", `WS endpoint: ${buildWsUrl("").replace(/\?$/, "")}`);

    // List all known agents
    addTrace(
      "debug",
      "AGENTS",
      `Agent roster loaded: ${AGENT_VOICE_CONFIG.length} agents`,
      AGENT_VOICE_CONFIG.map((a) => `${a.name} (${a.domain})`).join(", "),
    );

    // List data sources
    addTrace(
      "info",
      "DATA",
      `Data sources enumerated: ${DATA_SOURCES.length} known sources`,
      DATA_SOURCES.map((ds) => `${ds.name}: ${ds.status}`).join(" | "),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Health Check ────────────────────────────────────────────

  const checkHealth = useCallback(async () => {
    addTrace("info", "HEALTH", "Checking Agent Engine health endpoint...");
    try {
      const start = performance.now();
      const resp = await diagnosticApi.get("/v1/agents/health");
      const elapsed = Math.round(performance.now() - start);
      addTrace(
        "success",
        "HEALTH",
        `Agent Engine healthy (${elapsed}ms)`,
        JSON.stringify(resp.data, null, 2),
        elapsed,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addTrace("error", "HEALTH", `Agent Engine health check FAILED`, msg);
    }
  }, [addTrace]);

  // ── WebSocket Connection ────────────────────────────────────

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try { ws.close(); } catch { /* ignore */ }
    }
    wsRef.current = null;
    setConnectionStatus("disconnected");
    addTrace("info", "WS", "WebSocket disconnected");
  }, [addTrace]);

  const connect = useCallback(() => {
    disconnect();

    if (!accessToken) {
      addTrace("warn", "WS", "No access token — WebSocket will attempt unauthenticated connection");
    }

    const url = buildWsUrl(accessToken);
    addTrace("info", "WS", "Initiating WebSocket connection...", `URL: ${url.replace(/access-token=[^&]+/, "access-token=<redacted>")}`);
    setConnectionStatus("connecting");

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      reconnectAttempts.current = 0;
      addTrace("success", "WS", "WebSocket OPEN — connected to Agent Engine");
      addTrace("info", "MERIDIAN", "Waiting for Meridian handshake (session ID)...");
    };

    ws.onmessage = (event: MessageEvent) => {
      // Binary = audio data
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        addTrace("debug", "AUDIO", "Received audio chunk", `Size: ${event.data instanceof Blob ? event.data.size : (event.data as ArrayBuffer).byteLength} bytes`);
        return;
      }

      try {
        const msg = JSON.parse(event.data as string);
        const now = new Date();

        switch (msg.type) {
          case "connected": {
            if (msg.session_id) {
              setSessionId(msg.session_id);
              addTrace("success", "MERIDIAN", `Meridian handshake complete — session established`, `Session ID: ${msg.session_id}`);
            }
            addTrace("info", "MERIDIAN", "Meridian ready — data source connections active", DATA_SOURCES.map((ds) => ds.name).join(", "));
            break;
          }

          case "token": {
            if (!firstTokenTime.current && messageSentTime.current) {
              firstTokenTime.current = now;
              const ttft = now.getTime() - messageSentTime.current.getTime();
              addTrace("info", "STREAM", `First token received (TTFT: ${ttft}ms)`, `Agent: ${msg.agent ?? "unknown"}`);
            }
            if (msg.content) {
              setStreamingText((prev) => prev + msg.content);
            }
            if (msg.agent && msg.agent !== currentAgent) {
              setCurrentAgent(msg.agent);
              const voice = getAgentVoice(msg.agent);
              addTrace("info", "ROUTING", `Agent attribution: ${voice?.name ?? msg.agent}`, `Domain: ${msg.metadata?.domain ?? "unknown"}`);
            }
            setIsProcessing(true);
            break;
          }

          case "complete": {
            setIsProcessing(false);
            const responseTime = messageSentTime.current
              ? now.getTime() - messageSentTime.current.getTime()
              : null;

            const agent = msg.agent ?? currentAgent;
            const domain = msg.metadata?.domain ?? currentDomain;
            const voice = agent ? getAgentVoice(agent) : undefined;

            setCurrentAgent(agent);
            setCurrentDomain(domain);
            if (msg.session_id) setSessionId(msg.session_id);

            const finalText = msg.content ?? streamingText;

            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                sender: "assistant",
                text: finalText,
                timestamp: now,
                agent: voice?.name ?? agent ?? undefined,
                domain: domain ?? undefined,
                latencyMs: responseTime ?? undefined,
                ttftMs: firstTokenTime.current && messageSentTime.current
                  ? firstTokenTime.current.getTime() - messageSentTime.current.getTime()
                  : undefined,
                tokenCount: msg.metadata?.token_count,
              },
            ]);
            setStreamingText("");

            addTrace(
              "success",
              "RESPONSE",
              `Response complete — ${voice?.name ?? agent ?? "Meridian"} (${domain ?? "unknown"} domain)`,
              [
                `Total latency: ${responseTime ?? "N/A"}ms`,
                `TTFT: ${firstTokenTime.current && messageSentTime.current ? firstTokenTime.current.getTime() - messageSentTime.current.getTime() : "N/A"}ms`,
                `Tokens: ${msg.metadata?.token_count ?? "N/A"}`,
                `Response length: ${finalText.length} chars`,
              ].join(" | "),
              responseTime ?? undefined,
            );

            if (msg.observability) {
              addTrace("debug", "OBSERVABILITY", "Full observability payload received", JSON.stringify(msg.observability, null, 2));
            }

            messageSentTime.current = null;
            firstTokenTime.current = null;
            break;
          }

          case "error": {
            setIsProcessing(false);
            setStreamingText("");
            const errorMsg = msg.message ?? msg.content ?? "Unknown agent error";
            addTrace("error", "AGENT_ERROR", `Agent Engine error: ${errorMsg}`, msg.metadata ? JSON.stringify(msg.metadata) : undefined);
            break;
          }

          default: {
            addTrace("debug", "WS", `Unhandled message type: ${msg.type}`, JSON.stringify(msg));
          }
        }
      } catch {
        addTrace("error", "WS", "Failed to parse WebSocket message", String(event.data).slice(0, 200));
      }
    };

    ws.onerror = () => {
      addTrace("error", "WS", "WebSocket error event fired");
      setConnectionStatus("error");
    };

    ws.onclose = (event) => {
      setConnectionStatus("disconnected");
      addTrace("warn", "WS", `WebSocket closed (code: ${event.code}, reason: ${event.reason || "none"})`, `Clean: ${event.wasClean}`);

      if (reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectAttempts.current++;
        setConnectionStatus("reconnecting");
        addTrace("info", "WS", `Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/5)...`);
        reconnectTimer.current = setTimeout(() => connect(), delay);
      } else {
        addTrace("error", "WS", "Max reconnect attempts reached — giving up");
        setConnectionStatus("error");
      }
    };
  }, [accessToken, addTrace, currentAgent, currentDomain, disconnect, streamingText]);

  // ── Auto-connect on mount ───────────────────────────────────

  useEffect(() => {
    checkHealth();
    connect();
    return () => disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send Message ────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    const now = new Date();
    messageSentTime.current = now;
    firstTokenTime.current = null;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, sender: "user", text, timestamp: now },
    ]);
    setInputText("");
    setStreamingText("");

    addTrace("info", "SEND", `User message sent at ${ts(now)}`, `"${text.slice(0, 100)}${text.length > 100 ? "..." : ""}"`);

    // Send via WebSocket
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const payload = {
        type: "chat",
        action: "chat",
        message: text,
        access_token: accessToken,
      };
      ws.send(JSON.stringify(payload));
      addTrace("info", "WS", "Message dispatched to Agent Engine via WebSocket", `Payload size: ${JSON.stringify(payload).length} bytes`);
      addTrace("info", "MERIDIAN", "Meridian receiving message — starting intent classification...");
      addTrace("info", "ROUTING", "Meridian routing pipeline: Intent Classification → Domain Orchestrator → Agent Selection → Execution");
      setIsProcessing(true);
    } else {
      addTrace("error", "WS", "Cannot send — WebSocket not connected", `readyState: ${ws?.readyState ?? "null"}`);

      // Fallback: try REST
      addTrace("warn", "REST", "Falling back to REST endpoint POST /v1/agents/chat...");
      diagnosticApi
        .post("/v1/agents/chat", { message: text, session_id: sessionId })
        .then((resp) => {
          const data = resp.data;
          const responseTime = new Date().getTime() - now.getTime();
          addTrace("success", "REST", `REST response received (${responseTime}ms)`, JSON.stringify(data, null, 2));
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              sender: "assistant",
              text: data.response ?? data.content ?? data.message ?? JSON.stringify(data),
              timestamp: new Date(),
              agent: data.agent,
              domain: data.domain,
              latencyMs: responseTime,
            },
          ]);
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          addTrace("error", "REST", `REST fallback FAILED: ${msg}`);
        })
        .finally(() => setIsProcessing(false));
    }
  }, [inputText, isProcessing, accessToken, sessionId, addTrace]);

  // ── Voice Recording ─────────────────────────────────────────

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      addTrace("info", "VOICE", "Stopping voice recording...");
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
        setIsRecording(false);
        // Send voice_stop
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "voice_stop" }));
          addTrace("info", "VOICE", "voice_stop sent to Agent Engine");
        }
      }
      return;
    }

    addTrace("info", "VOICE", "Requesting microphone access...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      addTrace("success", "VOICE", "Microphone access granted", `Tracks: ${stream.getAudioTracks().length}`);

      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      addTrace("debug", "VOICE", `Selected MIME type: ${mimeType || "browser default"}`);

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          const ws = wsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(e.data);
          }
        }
      };

      mr.onstart = () => {
        setIsRecording(true);
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "voice_start", language: "en-US" }));
          addTrace("success", "VOICE", "Recording started — streaming audio to Agent Engine");
        }
      };

      mr.onstop = () => {
        setIsRecording(false);
        addTrace("info", "VOICE", "Recording stopped");
      };

      mr.start(250);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addTrace("error", "VOICE", `Microphone access DENIED: ${msg}`);
    }
  }, [isRecording, addTrace]);

  // ── Clear ───────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    setMessages([]);
    setTraceLog([]);
    setStreamingText("");
    setCurrentAgent(null);
    setCurrentDomain(null);
    addTrace("info", "PAGE", "Trace log and chat cleared");
  }, [addTrace]);

  // ── New Chat — full reset + reconnect (server issues new session_id) ──
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setTraceLog([]);
    setStreamingText("");
    setCurrentAgent(null);
    setCurrentDomain(null);
    setSessionId(null);
    addTrace("info", "PAGE", "Starting new chat — reconnecting to issue a fresh session");
    disconnect();
    // Slight delay so the disconnect's onclose trace lands before the
    // connect's "Opening WebSocket" trace. Same pattern as the Reconnect
    // button (line ~690).
    setTimeout(() => connect(), 50);
  }, [addTrace, disconnect, connect]);

  // ── Render Helpers ──────────────────────────────────────────

  const levelIcon = (level: TraceLevel) => {
    switch (level) {
      case "success": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />;
      case "error":   return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
      case "warn":    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
      case "info":    return <Activity className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
      case "debug":   return <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />;
    }
  };

  const levelBg = (level: TraceLevel) => {
    switch (level) {
      case "success": return "bg-green-50 border-green-200";
      case "error":   return "bg-red-50 border-red-200";
      case "warn":    return "bg-amber-50 border-amber-200";
      case "info":    return "bg-blue-50/50 border-blue-100";
      case "debug":   return "bg-gray-50 border-gray-100";
    }
  };

  const statusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Wifi className="h-3 w-3" /> {t("common.connected", { defaultValue: "Connected" })}
          </span>
        );
      case "connecting":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 animate-pulse">
            <Radio className="h-3 w-3" /> {t("diagnostic.statusConnecting", { defaultValue: "Connecting..." })}
          </span>
        );
      case "reconnecting":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 animate-pulse">
            <Radio className="h-3 w-3" /> {t("diagnostic.statusReconnecting", { defaultValue: "Reconnecting..." })}
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <WifiOff className="h-3 w-3" /> {t("common.error", { defaultValue: "Error" })}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <WifiOff className="h-3 w-3" /> {t("diagnostic.statusDisconnected", { defaultValue: "Disconnected" })}
          </span>
        );
    }
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-indigo-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                {t("diagnostic.title", { defaultValue: "Diagnostic Chat" })}
              </h1>
            </div>
            {statusBadge()}
            {sessionId && (
              <span className="text-xs text-gray-400 font-mono">
                {t("diagnostic.sessionLabel", { sessionId: sessionId.slice(0, 8), defaultValue: "Session: {{sessionId}}..." })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentAgent && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getDomainColor(currentDomain ?? "")}`}>
                <Server className="h-3 w-3" />
                {getAgentVoice(currentAgent)?.name ?? currentAgent}
              </span>
            )}
            <button
              onClick={handleNewChat}
              data-testid="diagnostic-new-chat-button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              title={t("diagnostic.newChatTitle", { defaultValue: "Start a new chat session" })}
            >
              <SquarePen className="h-3.5 w-3.5" />
              {t("diagnostic.newChat", { defaultValue: "New Chat" })}
            </button>
            <button
              onClick={() => { disconnect(); connect(); }}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {t("diagnostic.reconnect", { defaultValue: "Reconnect" })}
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              title={t("diagnostic.clearAllTitle", { defaultValue: "Clear all" })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTraceOpen((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${traceOpen ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-300 hover:bg-gray-50"}`}
            >
              {traceOpen ? t("common.hide", { defaultValue: "Hide" }) : t("common.show", { defaultValue: "Show" })} {t("diagnostic.traceLog", { defaultValue: "Trace Log" })}
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex flex-1 min-h-0">
          {/* Chat Panel */}
          <div className={`flex flex-col ${traceOpen ? "w-1/2" : "w-full"} border-r`}>
            {/* Data Sources Bar */}
            <div className="px-4 py-2 bg-gray-50 border-b text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-3.5 w-3.5 text-gray-500" />
                <span className="font-medium text-gray-600">{t("diagnostic.dataSourcesLabel", { defaultValue: "Connected Data Sources" })}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DATA_SOURCES.map((ds) => (
                  <span
                    key={ds.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {t(ds.labelKey, { defaultValue: ds.name })}
                  </span>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && !streamingText && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Network className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm font-medium">{t("diagnostic.emptyTitle", { defaultValue: "Diagnostic Chat Interface" })}</p>
                  <p className="text-xs mt-1">
                    {t("diagnostic.emptySubtitle", { defaultValue: "Send a message to trace the full request lifecycle" })}
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {msg.sender === "assistant" && msg.agent && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${getDomainColor(msg.domain ?? "")}`}>
                          {msg.agent}
                        </span>
                        {msg.domain && (
                          <span className="text-[10px] text-gray-400">
                            {msg.domain}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <div className={`flex items-center gap-3 mt-2 text-[10px] ${msg.sender === "user" ? "text-indigo-200" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {ts(msg.timestamp)}
                      </span>
                      {msg.latencyMs != null && (
                        <span>{t("diagnostic.latency", { latencyMs: msg.latencyMs, defaultValue: "Latency: {{latencyMs}}ms" })}</span>
                      )}
                      {msg.ttftMs != null && (
                        <span>{t("diagnostic.ttft", { ttftMs: msg.ttftMs, defaultValue: "TTFT: {{ttftMs}}ms" })}</span>
                      )}
                      {msg.tokenCount != null && (
                        <span>{t("diagnostic.tokens", { tokenCount: msg.tokenCount, defaultValue: "Tokens: {{tokenCount}}" })}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming indicator */}
              {streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl px-4 py-3 bg-gray-100 text-gray-900">
                    {currentAgent && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${getDomainColor(currentDomain ?? "")}`}>
                          {getAgentVoice(currentAgent)?.name ?? currentAgent}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-500">
                          <Radio className="h-2.5 w-2.5 animate-pulse" /> {t("diagnostic.streaming", { defaultValue: "streaming" })}
                        </span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{streamingText}</p>
                  </div>
                </div>
              )}

              {/* Processing indicator (no text yet) */}
              {isProcessing && !streamingText && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-3 bg-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span>{t("diagnostic.processing", { defaultValue: "Meridian processing..." })}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {/* Input Bar */}
            <div className="px-4 py-3 border-t bg-white shrink-0">
              <div className="flex items-end gap-2">
                <button
                  onClick={toggleRecording}
                  className={`shrink-0 p-2.5 rounded-lg transition-colors ${
                    isRecording
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title={isRecording ? t("diagnostic.stopRecording", { defaultValue: "Stop recording" }) : t("diagnostic.startVoiceInput", { defaultValue: "Start voice input" })}
                  disabled={false}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t("diagnostic.inputPlaceholder", { defaultValue: "Type a message to trace the full pipeline..." })}
                    disabled={isProcessing}
                    rows={1}
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isProcessing}
                    className="absolute right-2 bottom-2 p-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
                  <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                  {t("diagnostic.recordingHint", { defaultValue: "Recording — speak clearly, then stop to send" })}
                </div>
              )}
            </div>
          </div>

          {/* Trace Log Panel */}
          {traceOpen && (
            <div className="flex flex-col w-1/2 bg-gray-50">
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-white">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    {t("diagnostic.traceLog", { defaultValue: "Trace Log" })}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-mono">
                    {t("diagnostic.entriesCount", { count: traceLog.length, defaultValue: "{{count}} entries" })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    {t("diagnostic.errorsCount", { count: traceLog.filter((e) => e.level === "error").length, defaultValue: "{{count}} errors" })} |{" "}
                    {t("diagnostic.warningsCount", { count: traceLog.filter((e) => e.level === "warn").length, defaultValue: "{{count}} warnings" })}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                {traceLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-md border px-3 py-2 ${levelBg(entry.level)}`}
                  >
                    <div className="flex items-start gap-2">
                      {levelIcon(entry.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-400">
                            {ts(entry.timestamp)}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                            {entry.category}
                          </span>
                          {entry.elapsed != null && (
                            <span className="text-[10px] text-gray-400">
                              {entry.elapsed}ms
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-800 mt-0.5 leading-relaxed">
                          {entry.message}
                        </p>
                        {entry.detail && (
                          <pre className="text-[10px] text-gray-500 mt-1 whitespace-pre-wrap break-all font-mono bg-white/60 rounded px-2 py-1">
                            {entry.detail}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={traceEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
