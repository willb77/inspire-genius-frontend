import { api } from "@/lib/axios";
import type { BaseApiResponse } from "@/types/api";

export type UserAgentAssignment = {
  // Current response fields
  id: string;
  name?: string;
  category_id?: string;
  category_name?: string;
  type?: string;
  status?: string;
  created_at?: string;
  prompts?: unknown[];
  is_assigned_to_user?: boolean;
  is_removed_from_user?: boolean;
  // Backward-compat optional fields
  agent_id?: string;
  agent_name?: string;
  is_active?: boolean;
  gender?: string;
  voice_accent?: string;
  voice_tone?: string;
};

export type GetUserAssignmentsResponse = BaseApiResponse<{ agents?: UserAgentAssignment[] } & Record<string, unknown>>;

export async function getUserAgentAssignments(userId: string) {
  const { data } = await api.get<GetUserAssignmentsResponse>(
    `/v1/agents-settings/user/${encodeURIComponent(userId)}/agents`
  );
  return data;
}

export type AssignAgentsPayload = {
  user_id: string;
  agent_ids: string[];
  is_active: boolean;
};

export type AssignAgentsResponse = BaseApiResponse<Record<string, unknown>>;

export async function assignAgentsToUser(payload: AssignAgentsPayload) {
  const { data } = await api.post<AssignAgentsResponse>(
    "/v1/agents-settings/user/agents/assign",
    payload
  );
  return data;
}
