import {
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getMemberNarrative } from "@/services/bio/bioService"
import type { MemberNarrative } from "@/types/bio"

export const bioKeys = {
  all: ["bio"] as const,
  narrative: (memberId: string) => ["bio", "narrative", memberId] as const,
}

/**
 * The member's live Bio Capture narrative.
 *
 * One read backs the whole surface — modules, coverage, and every episode. A
 * short `staleTime` because the Chronicle chat panel beside it can change this
 * state mid-visit: a person talks to Chronicle, an episode is distilled, and the
 * narrative viewer should not still be showing the state from before it.
 *
 * The query is disabled until a `memberId` is known so it never fires with an
 * empty id.
 */
export function useBioNarrative(
  memberId: string | null | undefined,
  options?: Partial<UseQueryOptions<MemberNarrative, AxiosError>>,
) {
  return useQuery<MemberNarrative, AxiosError>({
    queryKey: bioKeys.narrative(memberId ?? "anon"),
    queryFn: () => getMemberNarrative(memberId as string),
    enabled: Boolean(memberId),
    staleTime: 30 * 1000,
    ...options,
  })
}
