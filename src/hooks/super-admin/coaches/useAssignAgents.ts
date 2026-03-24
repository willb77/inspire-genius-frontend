import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignAgentsToUser, type AssignAgentsPayload } from "@/services/super-admin/coaches/coachesService";
import { logAuditEvent } from "@/services/audit/audit.service";

export function useAssignAgents(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignAgentsPayload) => assignAgentsToUser(payload),
    onSuccess: async (_resp, variables) => {
      if (userId) {
        await qc.invalidateQueries({ queryKey: ["super-admin", "user-coaches", userId] });
      }
      logAuditEvent({ action: "coach_updated", actor_email: "admin", target_type: "user_coach_assignment", extra_data: { user_id: variables.user_id, agent_count: variables.agent_ids?.length } });
    },
  });
}
