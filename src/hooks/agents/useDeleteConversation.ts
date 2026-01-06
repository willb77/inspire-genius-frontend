import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversation } from "@/services/agent/agentService";

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { conversationId: string; agentId?: string }) => {
      return deleteConversation(vars.conversationId);
    },
    onSuccess: async (_data, vars) => {
      if (vars.agentId) {
        queryClient.invalidateQueries({ queryKey: ["agent", "conversation", vars.agentId], exact: false });
      } else {
        queryClient.invalidateQueries({ queryKey: ["agent", "conversation"], exact: false });
      }
      queryClient.removeQueries({ queryKey: ["conversation-messages", vars.conversationId], exact: true });
    },
  });
}
