import { useQuery } from "@tanstack/react-query"
import { listSavedRoles } from "@/services/knowledge-continuity/continuity.service"
import type { SavedRole } from "@/types/knowledge-continuity"

/**
 * The roles already blueprinted for an org — powers the "Load a saved role"
 * dropdown on Blueprint-a-role. A failed read leaves `data` empty but keeps
 * `isError`/`error`, so a 403 renders the access notice instead of "no roles".
 */
export function useSavedRoles(orgId: string) {
  return useQuery<SavedRole[]>({
    queryKey: ["kce", "saved-roles", orgId],
    queryFn: async () => {
      const res = await listSavedRoles(orgId)
      return res.data?.roles ?? []
    },
    staleTime: 30 * 1000,
  })
}
