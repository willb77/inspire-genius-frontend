import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignAgentsToUser, type AssignAgentsPayload } from "@/services/super-admin/coaches/coachesService";

export function useAssignAgents(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignAgentsPayload) => assignAgentsToUser(payload),
    onSuccess: async () => {
      if (userId) {
        await qc.invalidateQueries({ queryKey: ["super-admin", "user-coaches", userId] });
      }
    },
  });
}
