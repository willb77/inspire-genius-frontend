import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { resolveContradiction } from "@/services/knowledge-continuity/continuity.service"
import type { ResolveContradictionRequest } from "@/types/knowledge-continuity"

type ResolveVars = {
  relationId: string
  body: ResolveContradictionRequest
}

const ACTION_LABEL: Record<ResolveContradictionRequest["action"], string> = {
  dismiss: "dismissed — not a contradiction",
  keep_both: "kept both units",
  supersede: "superseded — the losing unit was deprecated",
}

/**
 * Adjudicate a candidate contradiction between two captured units
 * (POST /units/relations/{id}/resolve). Invalidates the review queue so the
 * resolved edge drops off.
 */
export function useResolveContradiction() {
  const qc = useQueryClient()
  return useMutation<unknown, AxiosError, ResolveVars>({
    mutationFn: async ({ relationId, body }) => {
      const res = await resolveContradiction(relationId, body)
      return res.data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["knowledge-continuity", "review-queue"] })
      toast.success(`Contradiction ${ACTION_LABEL[variables.body.action]}`)
    },
    onError: () => {
      toast.error("Couldn't resolve that contradiction. Please try again.")
    },
  })
}
