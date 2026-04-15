import { agentApi } from "@/lib/agentApi";

/** Non-streaming chat fallback (when WebSocket is unavailable) */
export async function meridianChat(
  message: string,
  sessionId?: string,
  context?: Record<string, unknown>,
) {
  const { data } = await agentApi.post("/v1/agents/chat", {
    message,
    session_id: sessionId,
    context,
  });
  return data;
}

/** Health check for Agent Engine */
export async function meridianHealth() {
  const { data } = await agentApi.get("/v1/agents/health");
  return data;
}

/** Build WebSocket URL for Meridian chat */
export function getMeridianWebSocketUrl(accessToken: string): string {
  const base =
    import.meta.env.VITE_AGENT_ENGINE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000";
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/ws/chat?access-token=${encodeURIComponent(accessToken)}`;
}

// Re-export conversation management from shared agent service
export {
  getAgentConversation,
  createConversation,
  getConversationDetail,
  deleteConversation,
  renameConversation,
  exportConversation,
} from "@/services/agent/agentService";
