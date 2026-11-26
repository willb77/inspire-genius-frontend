import type { DegreePlan } from "@/types/career-discovery"

/** At most this many targets in the plan block; the rest live on their pages. */
export const MAX_PLAN_TARGETS = 3

export type DegreePlanSummary = { program: string; termsLeft: number | null; finish: string | null }

/**
 * The one line the plan block shows for a degree plan, or `null` when there is
 * no plan to show (not available, no plan yet, or the engine refused). Reads
 * names and term counts only — never `costToFinish`.
 */
export function degreePlanSummary(data: DegreePlan | undefined): DegreePlanSummary | null {
  if (!data || !data.available || !data.plan) return null
  const plan = data.plan
  if (plan.refused) return null
  const program = plan.programs?.find((p) => p.title)?.title
  if (!program) return null
  return {
    program,
    termsLeft: typeof plan.termsLeft === "number" ? plan.termsLeft : null,
    finish: plan.expectedCompletion?.label ?? null,
  }
}
