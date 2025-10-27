import { useMutation } from "@tanstack/react-query";
import { createConversation } from "@/services/agent/agentService";

export function useCreateConversation() {
  return useMutation({
    mutationFn: async (vars: { agentId: string }) => {
      return createConversation(vars.agentId);
    },
  });
}
