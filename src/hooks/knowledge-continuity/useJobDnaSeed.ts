import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { getJobDnaKnowledgeTaxonomy } from "@/services/knowledge-continuity/capture.service"
import type { JobDnaTaxonomySeed } from "@/types/knowledge-continuity"

/**
 * Fetch a Job Blueprint's knowledge-taxonomy seed
 * (GET /v1/blueprint/job-dna/{id}/knowledge-taxonomy, blueprint-service). A
 * lazy mutation so the "Blueprint a role" form can pull the seed on demand when
 * a Job Blueprint is picked, then pass its nodes to the generate call. No
 * success toast — the seed simply prefills the form; only failures surface one.
 */
export function useJobDnaSeed() {
  return useMutation<JobDnaTaxonomySeed, AxiosError, string>({
    mutationFn: async (blueprintId) => {
      const res = await getJobDnaKnowledgeTaxonomy(blueprintId)
      if (!res.data) throw new Error("No knowledge taxonomy returned for this Job Blueprint")
      return res.data
    },
    onError: () => {
      toast.error("Couldn't load that Job Blueprint's knowledge seed. Please try again.")
    },
  })
}
