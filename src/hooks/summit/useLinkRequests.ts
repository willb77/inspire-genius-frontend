import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  actOnMyLinkRequest,
  createLinkRequest,
  getMyLinkRequests,
  leaveTeam,
  type LinkRequestCreateInput,
  type MemberLinkRequest,
} from "@/services/manager/development/growthService"
import { consentKeys } from "@/hooks/consent/useVisibility"

/**
 * The member's side of "ask a manager to add me" (MMLR-5).
 *
 * The list's 404 is the server saying the feature is not on for this member,
 * so it is never retried. Every mutation refreshes the list; leaving a team
 * also refreshes the sharing lists, because the manager's team link is one of
 * the reasons a person appears there.
 */
export const linkRequestKeys = {
  mine: ["growth", "link-requests", "mine"] as const,
}

function statusOf(err: unknown): number | undefined {
  return (err as AxiosError | undefined)?.response?.status
}

export function useMyLinkRequests(enabled: boolean) {
  return useQuery<MemberLinkRequest[], AxiosError>({
    queryKey: linkRequestKeys.mine,
    queryFn: async () => {
      const res = await getMyLinkRequests()
      const rows = res.data?.data
      return Array.isArray(rows) ? rows : []
    },
    enabled,
    staleTime: 15 * 1000,
    retry: (count, err) => statusOf(err) !== 404 && count < 1,
  })
}

export function useCreateLinkRequest() {
  const qc = useQueryClient()
  return useMutation<string, AxiosError, LinkRequestCreateInput>({
    mutationFn: async (input) => (await createLinkRequest(input)).data?.data?.message ?? "",
    onSuccess: () => qc.invalidateQueries({ queryKey: linkRequestKeys.mine }),
  })
}

export function useLinkRequestAction() {
  const qc = useQueryClient()
  return useMutation<MemberLinkRequest | undefined, AxiosError, { id: string; action: "withdraw" | "share" }>({
    mutationFn: async ({ id, action }) => (await actOnMyLinkRequest(id, action)).data?.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: linkRequestKeys.mine }),
  })
}

export function useLeaveTeam() {
  const qc = useQueryClient()
  return useMutation<{ left: boolean; requestId: string } | undefined, AxiosError, void>({
    mutationFn: async () => (await leaveTeam()).data?.data,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: linkRequestKeys.mine }),
        qc.invalidateQueries({ queryKey: consentKeys.people }),
        qc.invalidateQueries({ queryKey: consentKeys.myGrants }),
      ]),
  })
}
