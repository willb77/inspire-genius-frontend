import { getApi } from "@/lib/agentApi"
import type { ExplainFitResult, FitDetail } from "@/types/job-fit"

/**
 * Job-Fit narration API. Unlike fit.service (blueprint-service via the `api`
 * gateway, enveloped), this calls the AGENT ENGINE via getApi() and the
 * responses are FLAT (read res.data directly — no BaseApiResponse envelope).
 *
 * The endpoint only NARRATES the already-computed fit numbers; it never
 * re-scores. fitScore is echoed back unchanged.
 */
export type ExplainFitBody = {
  jobId: string
  roleTitle: string
  fitScore: number
  tier: string
  totalVariation: number
  perDimension: Array<{
    category: string
    dimensionName: string
    candidateScore: number
    benchmarkScore: number
    gap: number
    coaching?: string | boolean
  }>
  criticalGaps: Array<{ dimensionName: string; category: string; gap: number }>
  coachingGaps: Array<{ dimensionName: string; category: string; gap: number }>
  overdoneFlags: Array<{ dimensionName: string; candidateScore: number }>
  question?: string
}

/** Build the request body from a FitDetail (+ optional follow-up question). */
export function toExplainBody(data: FitDetail, fitScore: number, question?: string): ExplainFitBody {
  return {
    jobId: data.jobId,
    roleTitle: data.roleTitle,
    fitScore,
    tier: data.tier,
    totalVariation: data.totalVariation,
    perDimension: data.perDimension.map((d) => ({
      category: d.category,
      dimensionName: d.dimensionName,
      candidateScore: d.candidateScore,
      benchmarkScore: d.benchmarkScore,
      gap: d.gap,
      coaching: d.coaching,
    })),
    criticalGaps: data.criticalGaps,
    coachingGaps: data.coachingGaps,
    overdoneFlags: data.overdoneFlags,
    question: question?.trim() || undefined,
  }
}

export const explainService = {
  /** POST /v1/agents/blueprint/explain-fit — flat response. */
  async explain(body: ExplainFitBody): Promise<ExplainFitResult> {
    const res = await getApi().post<ExplainFitResult>("/v1/agents/blueprint/explain-fit", body)
    return res.data
  },
}
