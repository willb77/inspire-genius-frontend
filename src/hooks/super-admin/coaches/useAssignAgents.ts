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
      logAuditEvent({ event_type: "coach_updated", actor: "admin", resource: "user_coach_assignment", details: { user_id: variables.user_id, agent_count: variables.agent_ids?.length } });
    },
  });
}
