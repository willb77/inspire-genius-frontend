import { agentApi } from "@/lib/agentApi";

export type SystemStatus = {
  service: string;
  version: string;
  ecosystem_enabled: boolean;
  active_connections: number;
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const { data } = await agentApi.get<SystemStatus>("/v1/agents/system-status");
  return data;
}
