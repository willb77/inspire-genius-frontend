import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  actOnMyLinkRequest,
  createLinkRequest,
  decideLinkRequest,
  getIncomingLinkRequests,
  getMyLinkRequests,
  leaveTeam,
  type IncomingLinkRequest,
  type LinkRequestCreateInput,
  type MemberLinkRequest,
} from "@/services/manager/development/growthService"
import { consentKeys } from "@/hooks/consent/useVisibility"
import { developmentKeys } from "@/hooks/manager/development/queryKeys"

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
  incoming: ["growth", "link-requests", "incoming"] as const,
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

// ── MMLR-6: the manager's and company-admin's side ───────────────────────────

/**
 * Pending requests for the caller to decide (a manager) or oversee (a
 * company-admin). 403 and 404 are answers, not hiccups, so they are never
 * retried. A 200 `[]` is the common case: nothing pending, or the feature off.
 */
export function useIncomingLinkRequests(enabled: boolean) {
  return useQuery<IncomingLinkRequest[], AxiosError>({
    queryKey: linkRequestKeys.incoming,
    queryFn: async () => {
      const res = await getIncomingLinkRequests()
      const rows = res.data?.data
      return Array.isArray(rows) ? rows : []
    },
    enabled,
    staleTime: 15 * 1000,
    retry: (count, err) => {
      const s = statusOf(err)
      return s !== 403 && s !== 404 && count < 1
    },
  })
}

/**
 * Approve, decline or cancel one request. On success the row leaves the list
 * at once; an approval also refreshes the team roster, because the member is
 * on it now. Success or refusal, the list is re-read: a refusal means the
 * server's state moved under the caller.
 */
export function useDecideLinkRequest() {
  const qc = useQueryClient()
  return useMutation<
    IncomingLinkRequest | undefined,
    AxiosError,
    { id: string; action: "approve" | "decline" | "cancel" }
  >({
    mutationFn: async ({ id, action }) => (await decideLinkRequest(id, action)).data?.data,
    onSuccess: (_data, { id, action }) => {
      qc.setQueryData<IncomingLinkRequest[]>(linkRequestKeys.incoming, (rows) =>
        rows?.filter((r) => r.id !== id),
      )
      if (action === "approve") void qc.invalidateQueries({ queryKey: developmentKeys.roster() })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: linkRequestKeys.incoming }),
  })
}
