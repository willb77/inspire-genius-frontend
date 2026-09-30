/**
 * Feeds Phase 2 — the composite Job Fit's components, computed BESIDE the fit by
 * the agent engine (`POST /v1/agents/job-fit/components`). The fit score itself
 * is never changed; these explain what else is known about the role for this
 * person. An absent component carries a `status` saying why — never a zero.
 */
export type GoalVerdict = "supported" | "mixed" | "at-tension"

export type GoalAlignmentComponent =
  | {
      status: "scored"
      family: string
      score: number
      verdict: GoalVerdict
      goalIds: string[]
      goalTitles: string[]
      pullingDimensions: string[]
    }
  | { status: "unmapped" | "no_linked_goal" | "unscored"; family: string | null }

export type ExperienceMatchComponent =
  | { status: "scored"; score: number; covered: number; total: number; uncovered: string[] }
  | { status: "no_resume" | "no_activities" }

export type ComponentKey = "behavioural" | "goalAlignment" | "experienceMatch"

export type CompositeResult = {
  score: number | null
  used: ComponentKey[]
  missing: ComponentKey[]
  weights?: Partial<Record<ComponentKey, number>>
}

export type JobComponents =
  | {
      status: "ok"
      goalAlignment: GoalAlignmentComponent
      experienceMatch: ExperienceMatchComponent
      composite: CompositeResult
    }
  | { status: "not_found" }

export type FitComponentsResponse = {
  weights: Record<ComponentKey, number>
  engineVersion: string
  jobs: Record<string, JobComponents>
}

export type ComponentsJobIn = { jobId: string; fitScore?: number }

export type WiringGoal = {
  goalId: string | null
  title: string | null
  family: string | null
  verdict: GoalVerdict | "unmapped" | "unscored"
  score: number | null
  statement: string | null
  supporting: string[]
  opposing: string[]
}

export type GoalsWiring = {
  scored: boolean
  prismNeeded: boolean
  goals: WiringGoal[]
  engineVersion: string
}
