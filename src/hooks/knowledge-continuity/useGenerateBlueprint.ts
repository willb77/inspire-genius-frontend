import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { generateBlueprint } from "@/services/knowledge-continuity/capture.service"
import type {
  BlueprintGenerateRequest,
  BlueprintGenerateResponse,
} from "@/types/knowledge-continuity"

/**
 * Draft a role-knowledge taxonomy for review
 * (POST /v1/agents/kce/blueprint/generate, Agent Engine). No success toast — the
 * drafted tree lands in the review step; only failures surface a toast.
 */
export function useGenerateBlueprint() {
  return useMutation<BlueprintGenerateResponse, AxiosError, BlueprintGenerateRequest>({
    mutationFn: async (body) => {
      const res = await generateBlueprint(body)
      if (!res.data) throw new Error("No blueprint returned from the server")
      return res.data
    },
    onError: () => {
      toast.error("Couldn't draft the blueprint. Please try again.")
    },
  })
}
