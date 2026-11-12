import { useQuery } from "@tanstack/react-query"
import type { AxiosError } from "axios"

import { getMemberUsage, getOrgUsage } from "@/services/super-admin/orgUsage.service"
import type { MemberUsage, OrgUsage } from "@/types/super-admin/orgUsage"

export const orgUsageKeys = {
  org: (orgId: string, days: number) => ["org-usage", orgId, days] as const,
  member: (orgId: string, userId: string, days: number) =>
    ["org-usage", orgId, "member", userId, days] as const,
}

/** `retry: false`: a 403 means the caller is not super-admin and never will be. */
export function useOrgUsage(orgId: string | undefined, days: number) {
  return useQuery<OrgUsage, AxiosError>({
    queryKey: orgUsageKeys.org(orgId ?? "", days),
    queryFn: () => getOrgUsage(orgId as string, days),
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 60_000,
  })
}

/** Idle until a member is chosen, so rendering the table fetches nothing. */
export function useMemberUsage(orgId: string | undefined, userId: string | null, days: number) {
  return useQuery<MemberUsage, AxiosError>({
    queryKey: orgUsageKeys.member(orgId ?? "", userId ?? "", days),
    queryFn: () => getMemberUsage(orgId as string, userId as string, days),
    enabled: Boolean(orgId && userId),
    retry: false,
    staleTime: 60_000,
  })
}
