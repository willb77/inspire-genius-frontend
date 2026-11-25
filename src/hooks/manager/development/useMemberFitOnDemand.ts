import { useMutation, useQuery } from "@tanstack/react-query"
import {
  getMemberFitOnDemandRoles,
  scoreMemberFitOnDemand,
} from "@/services/manager/development/growthService"
import type { MemberFitOnDemand, MemberFitOnDemandRoles } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/** An HTTP status off an unknown error, without assuming it is an AxiosError. */
function httpStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined
  const response = (err as { response?: { status?: unknown } }).response
  return typeof response?.status === "number" ? response.status : undefined
}

/**
 * TS-4b — the roles a member can be scored against on demand, always with a
 * `state`.
 *
 * `off` is the answer everywhere until the server switch is turned on for the
 * member's organisation, and the page then offers no picker. A backend that
 * does not have the route yet answers 404; that is the same fact ("not offered
 * here"), so it reads as `off` too. Any OTHER failure is thrown, so the page
 * shows an error rather than quietly hiding the picker. A response without a
 * `state` is `unavailable`, never an empty role list.
 */
export function useMemberFitOnDemandRoles(memberId: string | undefined, enabled: boolean) {
  return useQuery<MemberFitOnDemandRoles>({
    queryKey: developmentKeys.fitOnDemandRoles(memberId ?? ""),
    queryFn: async () => {
      let data: MemberFitOnDemandRoles | undefined
      try {
        data = (await getMemberFitOnDemandRoles(memberId as string)).data?.data
      } catch (err) {
        if (httpStatus(err) === 404) return { state: "off", roles: [] }
        throw err
      }
      if (!data || !data.state) return { state: "unavailable", roles: [] }
      return { ...data, roles: data.roles ?? [] }
    },
    enabled: enabled && Boolean(memberId),
    staleTime: 60_000,
    retry: false,
  })
}

/**
 * TS-4b — score the member against one role, now. Not cached and never
 * retried: each call is a measurement the server records. A response without a
 * `state` is `unavailable`, never a score.
 */
export function useScoreMemberFitOnDemand(memberId: string) {
  return useMutation<MemberFitOnDemand, unknown, string>({
    mutationFn: async (jobId) => {
      const data = (await scoreMemberFitOnDemand(memberId, jobId)).data?.data
      if (!data || !data.state) return { state: "unavailable", result: null }
      return { ...data, result: data.result ?? null }
    },
    retry: false,
  })
}
