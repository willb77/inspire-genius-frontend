import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAgents,
  createCoach as svcCreateCoach,
  updateCoach as svcUpdateCoach,
  deactivateCoach as svcDeactivateCoach,
  getCoachCategories,
  type AgentsListParams,
  type CreateCoachBody,
  type UpdateCoachBody,
} from "@/services/super-admin/coachManagementService";
import { logAuditEvent } from "@/services/audit/audit.service";

const QK = {
  list: (params: AgentsListParams) => ["super-admin", "coaches", params] as const,
  categories: ["super-admin", "coach-categories"] as const,
};

export function useCoachesList(params: AgentsListParams) {
  return useQuery({
    queryKey: QK.list(params),
    queryFn: () => listAgents(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCoachCategories() {
  return useQuery({
    queryKey: QK.categories,
    queryFn: () => getCoachCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCoach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCoachBody) => svcCreateCoach(body),
    onSuccess: (_resp, variables) => {
      qc.invalidateQueries({ queryKey: ["super-admin", "coaches"], exact: false });
      logAuditEvent({ event_type: "coach_created", actor: "admin", resource: "coach", details: { name: variables.name } });
    },
  });
}

export function useUpdateCoach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCoachBody) => svcUpdateCoach(body),
    onSuccess: (_resp, variables) => {
      qc.invalidateQueries({ queryKey: ["super-admin", "coaches"], exact: false });
      logAuditEvent({ event_type: "coach_updated", actor: "admin", resource: "coach", details: { agent_id: variables.agent_id } });
    },
  });
}

export function useDeactivateCoach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => svcDeactivateCoach(agentId),
    onSuccess: (_resp, agentId) => {
      qc.invalidateQueries({ queryKey: ["super-admin", "coaches"], exact: false });
      logAuditEvent({ event_type: "coach_deleted", actor: "admin", resource: "coach", details: { agent_id: agentId } });
    },
  });
}
