import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { createTaxonomyNode } from "@/services/knowledge-continuity/continuity.service"
import type { CreateTaxonomyRequest, TaxonomyNode } from "@/types/knowledge-continuity"

/**
 * Create the taxonomy node a capture will mine
 * (POST /v1/trainer/continuity/taxonomy). Returns the node whose id threads
 * through the session, its turns, and the extracted units. No success toast —
 * it is the first, silent step of setting up a capture.
 */
export function useCreateTaxonomyNode() {
  return useMutation<TaxonomyNode, AxiosError, CreateTaxonomyRequest>({
    mutationFn: async (body) => {
      const res = await createTaxonomyNode(body)
      if (!res.data) throw new Error("No taxonomy node returned from the server")
      return res.data
    },
    onError: () => {
      toast.error("Couldn't set up the capture area. Please try again.")
    },
  })
}
