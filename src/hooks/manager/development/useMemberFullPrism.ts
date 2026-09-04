import { useQuery } from "@tanstack/react-query"
import { getMemberFullPrism } from "@/services/manager/development/growthService"
import type { FullPrismProfileResponse } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/**
 * Every PRISM scale on file for one member — up to 88, with every score type.
 *
 * Distinct from the dossier, which carries the eight-behaviour radar and
 * Underlying values only. This is the only read that surfaces ADAPTED scores to
 * the manager surfaces, and it is a plain read: no agent, no compute job, so it
 * returns in one round trip rather than the dossier's ~60s.
 *
 * `null` means the member has no assessment on file, which is an ordinary state
 * and not an error — the caller falls back to the behaviour radar. A CONFLICTED
 * profile is not that: it still returns, with `isConflicted` set, so the caller
 * can say why it is refusing rather than present the person as having no data.
 */
export function useMemberFullPrism(memberId: string | undefined) {
  return useQuery<FullPrismProfileResponse | null>({
    queryKey: developmentKeys.fullPrism(memberId ?? ""),
    enabled: Boolean(memberId),
    queryFn: async () => {
      const r = await getMemberFullPrism(memberId as string)
      return r.data?.data ?? null
    },
    staleTime: 60_000,
  })
}
