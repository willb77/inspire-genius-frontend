import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { explainService, type ExplainFitBody } from "@/services/job-fit/explain.service"
import type { ExplainFitResult } from "@/types/job-fit"

/**
 * Narrate a person's Job Fit (POST /v1/agents/blueprint/explain-fit). A mutation
 * (not a query) because it's an on-demand LLM call — used both for the initial
 * overview (no question) and for inline follow-ups (with a question).
 */
export function useExplainFit() {
  return useMutation<ExplainFitResult, AxiosError, ExplainFitBody>({
    mutationKey: ["job-fit", "explain"],
    mutationFn: (body) => explainService.explain(body),
  })
}
