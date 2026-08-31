import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getBioSession,
  listBioSessions,
  saveBioSession,
} from "@/services/bio/bioService"
import type {
  BioSessionDetail,
  BioSessionSummary,
  SaveBioSessionRequest,
} from "@/types/bio"

export const bioSessionKeys = {
  all: ["bio", "sessions"] as const,
  list: (memberId: string) => ["bio", "sessions", memberId] as const,
}

/**
 * The member's saved Chronicle interview sessions, for the "resume a session"
 * dropdown.
 *
 * The endpoint MAY 404 where the session backend hasn't been promoted yet, so
 * this query does NOT retry and surfaces an empty list on error — a missing
 * backend degrades to "no saved sessions", never a broken surface. Disabled
 * until a `memberId` is known.
 */
export function useBioSessions(
  memberId: string | null | undefined,
  options?: Partial<UseQueryOptions<BioSessionSummary[], AxiosError>>,
) {
  return useQuery<BioSessionSummary[], AxiosError>({
    queryKey: bioSessionKeys.list(memberId ?? "anon"),
    queryFn: () => listBioSessions(memberId as string),
    enabled: Boolean(memberId),
    retry: false,
    staleTime: 15 * 1000,
    ...options,
  })
}

export type SaveBioSessionVars = SaveBioSessionRequest & { memberId: string }

/**
 * Save (create or upsert) an interview session. On success the sessions list is
 * invalidated so the dropdown reflects the new/updated row immediately.
 */
export function useSaveBioSession() {
  const qc = useQueryClient()
  return useMutation<BioSessionSummary, AxiosError, SaveBioSessionVars>({
    mutationFn: ({ memberId, ...body }) => saveBioSession(memberId, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: bioSessionKeys.list(vars.memberId) })
    },
  })
}

/**
 * Imperatively fetch one full session (with transcript) to resume it. Exposed as
 * a mutation so the caller can `mutateAsync` on demand from the dropdown rather
 * than holding a query per session id.
 */
export function useLoadBioSession() {
  return useMutation<
    BioSessionDetail,
    AxiosError,
    { memberId: string; sessionId: string }
  >({
    mutationFn: ({ memberId, sessionId }) => getBioSession(memberId, sessionId),
  })
}
