import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { listCitableUnits } from "@/services/knowledge-continuity/continuity.service"
import type { CitableUnits } from "@/types/knowledge-continuity"

/**
 * Fetch a role's citable units (validated|provisional) for a taxonomy — the
 * source set a curriculum is built from (GET /continuity/units). A mutation
 * because it fires on an explicit "Build a curriculum" click, not on mount.
 */
export function useCitableUnits() {
  return useMutation<CitableUnits, AxiosError, string>({
    mutationFn: async (taxonomyId) => {
      const res = await listCitableUnits(taxonomyId)
      return res.data ?? { taxonomy_id: taxonomyId, bands: [], units: [] }
    },
    onError: () => {
      toast.error("Couldn't load this role's validated knowledge. Please try again.")
    },
  })
}
