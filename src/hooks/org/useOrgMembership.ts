import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  createJoinRequest,
  decideJoinRequest,
  getMyJoinRequest,
  listJoinRequests,
} from "@/services/org-membership"
import type {
  CreateJoinRequestPayload,
  DecideJoinRequestPayload,
} from "@/types/org-membership"

export const orgMembershipKeys = {
  mine: ["org-membership", "mine"] as const,
  queue: (orgId: string, status: string) =>
    ["org-membership", "queue", orgId, status] as const,
}

export function useMyJoinRequest(enabled = true) {
  return useQuery({
    queryKey: orgMembershipKeys.mine,
    queryFn: getMyJoinRequest,
    enabled,
  })
}

export function useCreateJoinRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateJoinRequestPayload) => createJoinRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgMembershipKeys.mine })
      toast.success("Request sent — a manager needs to approve it before it takes effect.")
    },
    onError: () => toast.error("Could not send the request. Please try again."),
  })
}

export function useJoinRequestQueue(orgId: string | undefined, status = "pending") {
  return useQuery({
    queryKey: orgMembershipKeys.queue(orgId ?? "", status),
    queryFn: () => listJoinRequests(orgId as string, status),
    enabled: Boolean(orgId),
  })
}

export function useDecideJoinRequest(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: DecideJoinRequestPayload & { id: string }) =>
      decideJoinRequest(id, payload),
    onSuccess: (_data, variables) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: orgMembershipKeys.queue(orgId, "pending") })
      }
      toast.success(
        variables.approve
          ? "Approved — they now belong to your organisation."
          : "Request rejected.",
      )
    },
    onError: () => toast.error("Could not record that decision. Please try again."),
  })
}
