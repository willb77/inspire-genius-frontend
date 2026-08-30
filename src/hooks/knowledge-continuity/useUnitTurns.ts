import { useQuery } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getUnitTurns } from "@/services/knowledge-continuity/continuity.service"
import type { UnitTurns } from "@/types/knowledge-continuity"

/**
 * The interview exchanges behind a synthesized unit — "replay the utterance"
 * provenance (GET /units/{id}/turns). Lazy: pass `enabled` (e.g. only when the
 * reviewer expands the provenance panel) so it fetches on demand.
 */
export function useUnitTurns(unitId: string, enabled: boolean) {
  return useQuery<UnitTurns, AxiosError>({
    queryKey: ["knowledge-continuity", "unit-turns", unitId],
    queryFn: async () => {
      const res = await getUnitTurns(unitId)
      return res.data ?? { unit_id: unitId, session_id: "", taxonomy_node_id: null, turns: [] }
    },
    enabled: enabled && unitId.length > 0,
    staleTime: 60 * 1000,
  })
}
