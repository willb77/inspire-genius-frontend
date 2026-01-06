import { api } from "@/lib/axios";
import { format } from "date-fns";

export type AgentConversationParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function getAgentConversation(agentId: string, params: AgentConversationParams = {}) {
  const { page = 1, limit = 20, search } = params;
  const query: Record<string, unknown> = { agent_id: agentId, page, limit };
  if (typeof search === "string" && search.trim().length > 0) {
    query.search = search.trim();
  }
  const resp = await api.get(`/v1/chat/conversations`, {
    params: query,
  });
  return resp.data as unknown;
}

export async function createConversation(agentId: string) {
  const resp = await api.post(`/v1/chat/sessions/start`, { agent_id: agentId });
  return resp.data as unknown;
}

export async function getConversationDetail(conversationId: string, page: number = 1, pageSize: number = 50) {
  const resp = await api.get(`/v1/chat/conversations/${conversationId}/messages`, {
    params: { page, page_size: pageSize, limit: pageSize },
  });
  return resp.data as unknown;
}

export async function deleteConversation(conversationId: string) {
  const resp = await api.delete(`/v1/chat/conversations/${conversationId}`);
  return resp.data as unknown;
}

export async function exportConversation(conversationId: string, from: Date, to: Date) {
  const start = format(from, "yyyy-MM-dd");
  const end = format(to, "yyyy-MM-dd");
  const resp = await api.get(`/v1/chat/conversations/${conversationId}/download`, {
    params: {
      start_date: start,
      end_date: end,
    },
  });
  return resp.data as unknown as { status: boolean; file_name: string; mime_type: string; base64_pdf?: string; base64_csv?: string };
}
