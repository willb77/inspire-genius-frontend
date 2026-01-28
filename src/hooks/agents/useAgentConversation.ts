import { useQuery } from "@tanstack/react-query";
import { getAgentConversation, type AgentConversationParams } from "@/services/agent/agentService";

export function useAgentConversation(agentId?: string, params: AgentConversationParams = { page: 1, limit: 20 }) {
  return useQuery({
    queryKey: ["agent", "conversation", agentId, params.page, params.limit, params.search ?? ""],
     refetchOnWindowFocus: false,
    queryFn: () => {
      if (!agentId) throw new Error("agentId required");
      return getAgentConversation(agentId, params);
    },
    enabled: !!agentId,
    staleTime: 30_000,
  });
}
