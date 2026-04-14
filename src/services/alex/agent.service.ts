import { getApi } from "@/lib/agentApi";

// ─── Types ────────────────────────────────────────────────────────

export type AgentChatRequest = {
  message: string;
  session_id?: string | null;
  context?: Record<string, unknown> | null;
};

export type AgentChatResponse = {
  content: string;
  agent: string;
  session_id: string;
  confidence: number;
  metadata?: Record<string, unknown>;
};

export type AgentHealthResponse = {
  status: string;
  service: string;
  version: string;
  active_connections?: number;
};

/** WebSocket message sent from client to server */
export type WsOutgoingMessage = {
  type: "chat";
  message: string;
  context?: Record<string, unknown> | null;
};

/** WebSocket message received from server */
export type WsIncomingMessage =
  | { type: "token"; content: string; agent: string }
  | { type: "complete"; content: string; agent: string; session_id: string }
  | { type: "error"; message: string }
  | { type: "connected"; session_id: string };

// ─── REST Endpoints ───────────────────────────────────────────────

/** Non-streaming chat — POST /v1/agents/chat */
export async function agentChat(request: AgentChatRequest): Promise<AgentChatResponse> {
  const { data } = await getApi().post<AgentChatResponse>("/v1/agents/chat", request);
  return data;
}

/** Health check — GET /v1/agents/health */
export async function agentHealth(): Promise<AgentHealthResponse> {
  const { data } = await getApi().get<AgentHealthResponse>("/v1/agents/health");
  return data;
}

// ─── WebSocket URL Builder ────────────────────────────────────────

/**
 * Build the Agent Engine WebSocket URL.
 * Uses VITE_AGENT_WS_URL if set, otherwise derives from VITE_API_BASE_URL
 * by replacing http(s) with ws(s) and appending /ws/chat.
 */
export function getAgentWebSocketUrl(accessToken: string): string {
  const explicit = import.meta.env.VITE_AGENT_WS_URL as string | undefined;
  if (explicit) {
    return `${explicit}?access-token=${encodeURIComponent(accessToken)}`;
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:3000";
  const wsUrl = baseUrl.replace(/^http/, "ws");
  return `${wsUrl}/ws/chat?access-token=${encodeURIComponent(accessToken)}`;
}
