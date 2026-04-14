import { getApi } from "@/lib/agentApi";

export type AgentItem = {
  id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  created_at?: string;
  type?: string;
  status?: string;
  persona?: string;
  voice_style?: string;
  prompts?: Array<{ id: string; text: string; created_at: string }>;
};

export type AgentsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
};

export async function listAgents(params: AgentsListParams = {}) {
  const { page = 1, limit = 10, search, status, type } = params;
  const resp = await getApi().get("/v1/agents-settings/agents", {
    params: { page, page_size: limit, search, status, type },
  });
  return resp.data as {
    message: string;
    status: boolean;
    data: AgentItem[] | { agents: AgentItem[]; pagination: { total: number; page: number; page_size: number } };
  };
}

export type CreateCoachBody = {
  name: string;
  category_id?: string;
  category_name?: string;
  prompt: string;
};

export async function createCoach(body: CreateCoachBody) {
  const resp = await getApi().post("/v1/agents-settings/agents", body);
  return resp.data as { status: boolean; message?: string };
}

export type UpdateCoachBody = {
  agent_id: string;
  prompt: string;
  persona?: string;
  voice_style?: string;
  status?: string;
};

export async function updateCoach(body: UpdateCoachBody) {
  const { agent_id, ...rest } = body;
  const resp = await getApi().put(`/v1/agents-settings/agents`, rest, { params: { agent_id } });
  return resp.data as { status: boolean; message?: string };
}

export async function deactivateCoach(agentId: string) {
  const resp = await getApi().put(`/v1/agents-settings/agents`, { status: "deactivated" }, { params: { agent_id: agentId } });
  return resp.data as { status: boolean; message?: string };
}

export async function deleteCoach(agentId: string) {
  const resp = await getApi().delete(`/v1/agents-settings/agents`, { params: { agent_id: agentId } });
  return resp.data as { status: boolean; message?: string };
}

export async function getCoachCategories() {
  const resp = await getApi().get("/v1/agents-settings/category");
  return resp.data as {
    status: boolean;
    data?: { Tones: Array<{ id: string; name: string; display_name: string; type: string; created_at: string }> };
  };
}
