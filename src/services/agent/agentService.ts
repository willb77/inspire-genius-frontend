import axios from "axios";
import { api } from "@/lib/axios";
import { agentApi } from "@/lib/agentApi";
import { format } from "date-fns";

/**
 * When the user is in monolith mode (agent_engine_enabled=false), conversation
 * CRUD must hit the monolith CloudFront origin directly. The deployed
 * VITE_API_BASE_URL points at API Gateway, so neither `api` nor `agentApi`
 * reaches the monolith. Sessions created on agent-engine aren't visible to
 * the monolith WS handler, which causes "Conversation not found" on WS frames.
 *
 * The CloudFront monolith distribution at dvw79io0afgrp.cloudfront.net has
 * a default-origin behavior pointing at the EC2 monolith.
 */
const MONOLITH_DIRECT_URL =
  (import.meta.env.VITE_MONOLITH_DIRECT_URL as string) ||
  "https://dvw79io0afgrp.cloudfront.net";

function isAgentEngineOn(): boolean {
  try {
    const v = localStorage.getItem("agent_engine_enabled");
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

function getMonolithClient() {
  const commonHeaders = (api?.defaults?.headers?.common ?? {}) as Record<string, unknown>;
  return axios.create({
    baseURL: MONOLITH_DIRECT_URL,
    headers: commonHeaders as never,
  });
}

export type AgentConversationParams = {
  page?: number;
  limit?: number;
  search?: string;
};

/**
 * Conversation CRUD goes directly to the Agent Engine (agentApi) because
 * API Gateway only routes /v1/chat/AlexChat/* through CloudFront, NOT
 * /v1/chat/conversations or /v1/chat/sessions.  The Agent Engine has the
 * conversation routes at /v1/chat/conversations and /v1/chat/sessions/start.
 */

export async function getAgentConversation(agentId: string, params: AgentConversationParams = {}) {
  const { page = 1, limit = 20, search } = params;
  const query: Record<string, unknown> = { agent_id: agentId, page, limit };
  if (typeof search === "string" && search.trim().length > 0) {
    query.search = search.trim();
  }
  try {
    const resp = await agentApi.get(`/v1/chat/conversations`, { params: query });
    return resp.data as unknown;
  } catch {
    // Fall back to monolith (CloudFront)
    const resp = await api.get(`/v1/chat/conversations`, { params: query });
    return resp.data as unknown;
  }
}

export async function createConversation(agentId: string) {
  // In monolith mode go straight to the CloudFront monolith — sessions created
  // on agent-engine wouldn't be visible to the monolith WS handler.
  if (!isAgentEngineOn()) {
    const client = getMonolithClient();
    const resp = await client.post(`/v1/chat/sessions/start`, { agent_id: agentId });
    return resp.data as unknown;
  }
  try {
    const resp = await agentApi.post(`/v1/chat/sessions/start`, { agent_id: agentId });
    return resp.data as unknown;
  } catch {
    const resp = await api.post(`/v1/chat/sessions/start`, { agent_id: agentId });
    return resp.data as unknown;
  }
}

export async function getConversationDetail(conversationId: string, page: number = 1, pageSize: number = 50) {
  try {
    const resp = await agentApi.get(`/v1/chat/conversations/${conversationId}/messages`, {
      params: { page, page_size: pageSize, limit: pageSize },
    });
    return resp.data as unknown;
  } catch {
    const resp = await api.get(`/v1/chat/conversations/${conversationId}/messages`, {
      params: { page, page_size: pageSize, limit: pageSize },
    });
    return resp.data as unknown;
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    const resp = await agentApi.delete(`/v1/chat/conversations/${conversationId}`);
    return resp.data as unknown;
  } catch {
    const resp = await api.delete(`/v1/chat/conversations/${conversationId}`);
    return resp.data as unknown;
  }
}

export async function renameConversation(conversationId: string, title: string) {
  try {
    const resp = await agentApi.patch(`/v1/chat/conversations/${conversationId}`, { title });
    return resp.data as unknown;
  } catch {
    const resp = await api.patch(`/v1/chat/conversations/${conversationId}`, { title });
    return resp.data as unknown;
  }
}

/**
 * @deprecated Since PR willb77/inspire-genius-frontend#147 (Meridian Chat
 * dual-PDF export), the chat-screen Export button no longer uses this
 * endpoint. The new flow is:
 *   1. Try POST /v1/agents/export/transcript (server-side WeasyPrint).
 *   2. On failure, fall back to client-side jspdf+html2canvas.
 *   3. As a last resort, fall back to this single-PDF legacy endpoint.
 *
 * Retire after one sprint of zero hits in agent-engine logs. Tracking
 * via the legacy endpoint name in CloudWatch Logs Insights:
 *   filter @message like /\/v1\/chat\/conversations\/[a-f0-9-]+\/download/
 *
 * Do not add new callers.
 */
export async function exportConversation(conversationId: string, from: Date, to: Date) {
  const start = format(from, "yyyy-MM-dd");
  const end = format(to, "yyyy-MM-dd");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    const resp = await agentApi.get(`/v1/chat/conversations/${conversationId}/download`, {
      params: { start_date: start, end_date: end, timezone },
    });
    return resp.data as unknown as { status: boolean; file_name: string; mime_type: string; base64_pdf?: string; base64_csv?: string };
  } catch {
    const resp = await api.get(`/v1/chat/conversations/${conversationId}/download`, {
      params: { start_date: start, end_date: end, timezone },
    });
    return resp.data as unknown as { status: boolean; file_name: string; mime_type: string; base64_pdf?: string; base64_csv?: string };
  }
}

/** Wire shape for POST /v1/agents/export/transcript. */
export type TranscriptTurnPayload = {
  role: "user" | "assistant";
  speaker_raw: string;
  body: string;
  timestamp?: string | null;
  contributing_agents?: string[] | null;
};
export type TranscriptMetaPayload = {
  session_subject: string;
  from_label: string;
  to_label: string;
  user_label: string;
  slug: string;
  assistant_domain?: string;
};
export type ExportTranscriptServerResponse = {
  status: boolean;
  files: Array<{ file_name: string; mime_type: string; base64: string }>;
};

/**
 * Server-side dual-PDF export. Calls the agent-engine WeasyPrint renderer
 * at POST /v1/agents/export/transcript. Sharper text + native @page rules
 * than the client-side html2canvas fallback, and avoids shipping ~600KB
 * of PDF deps in the frontend bundle.
 *
 * Caller is expected to fall back to the client-side renderer in
 * `@/lib/exportTranscript` on any non-2xx (503 = backend not yet
 * upgraded with WeasyPrint; 500 = transient render failure).
 */
export async function exportTranscriptViaServer(
  turns: TranscriptTurnPayload[],
  meta: TranscriptMetaPayload,
): Promise<ExportTranscriptServerResponse> {
  const body = { turns, meta };
  try {
    const resp = await agentApi.post(`/v1/agents/export/transcript`, body);
    return resp.data as ExportTranscriptServerResponse;
  } catch {
    const resp = await api.post(`/v1/agents/export/transcript`, body);
    return resp.data as ExportTranscriptServerResponse;
  }
}
