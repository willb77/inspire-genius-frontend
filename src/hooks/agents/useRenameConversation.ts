import { useMutation, useQueryClient } from "@tanstack/react-query";
import { renameConversation } from "@/services/agent/agentService";

export function useRenameConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { conversationId: string; title: string; agentId?: string }) => {
      return renameConversation(vars.conversationId, vars.title);
    },
    onSuccess: async (_data, vars) => {
      if (vars.agentId) {
        queryClient.invalidateQueries({ queryKey: ["agent", "conversation", vars.agentId], exact: false });
      } else {
        queryClient.invalidateQueries({ queryKey: ["agent", "conversation"], exact: false });
      }
    },
  });
}
