import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { getSavedRoleBlueprint } from "@/services/knowledge-continuity/continuity.service"
import type { SavedRoleBlueprint } from "@/types/knowledge-continuity"

/**
 * Load a saved role's blueprint tree on demand (when the user picks it from the
 * "Load a saved role" dropdown). A mutation rather than a query because it fires
 * on an explicit pick, not on mount.
 */
export function useSavedRoleBlueprint(orgId: string) {
  return useMutation<SavedRoleBlueprint, AxiosError, string>({
    mutationFn: async (roleTitle) => {
      const res = await getSavedRoleBlueprint(orgId, roleTitle)
      if (!res.data) throw new Error("No blueprint returned for that role")
      return res.data
    },
    onError: () => {
      toast.error("Couldn't load that saved role. Please try again.")
    },
  })
}
