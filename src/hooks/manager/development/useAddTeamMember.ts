import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  addTeamMember,
  bulkAddTeamMembers,
  deleteTeamMember,
} from "@/services/manager/development/growthService"
import type {
  BulkMembersResult,
  MemberCreateInput,
  MemberCreateResult,
} from "@/types/development"
import { developmentKeys } from "./queryKeys"

/** Add a single team member; refetches the roster on success. */
export function useAddTeamMember() {
  const qc = useQueryClient()
  return useMutation<MemberCreateResult | undefined, unknown, MemberCreateInput>({
    mutationFn: async (input) => (await addTeamMember(input)).data?.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: developmentKeys.roster() }),
  })
}

/** Bulk-add team members (CSV); refetches the roster on success. */
export function useBulkAddTeamMembers() {
  const qc = useQueryClient()
  return useMutation<BulkMembersResult | undefined, unknown, MemberCreateInput[]>({
    mutationFn: async (members) => (await bulkAddTeamMembers(members)).data?.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: developmentKeys.roster() }),
  })
}

/** Remove a manager-added member; refetches the roster on success. */
export function useDeleteTeamMember() {
  const qc = useQueryClient()
  return useMutation<{ deleted: boolean } | undefined, unknown, string>({
    mutationFn: async (memberId) => (await deleteTeamMember(memberId)).data?.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: developmentKeys.roster() }),
  })
}
