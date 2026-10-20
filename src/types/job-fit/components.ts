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

/**
 * FIT-3 — Overall fit, beside the PRISM fit. Present only while the server's
 * `overall_fit` switch is on; the response then carries `overall` per role and
 * no `composite`. Each signal is 0-100 or absent, with a `status` saying why —
 * never a zero. The ordering is done here, in the person's own browser.
 */
export type OverallSignalKey = "prism" | "function" | "seniority" | "skills" | "goal"

export type OverallSignal = {
  status: string
  score?: number
  roleFamily?: string | null
  personFamily?: string
  secondaryFamilies?: string[]
  evidence?: string | null
  source?: string
  roleLevel?: number | null
  personLevel?: number
  goalFamilies?: string[]
  covered?: number
  total?: number
  uncovered?: string[]
}

export type OverallResult = {
  score: number | null
  used: OverallSignalKey[]
  missing: OverallSignalKey[]
  weights?: Partial<Record<OverallSignalKey, number>>
  status?: "not_set_up"
  signals: Partial<Record<OverallSignalKey, OverallSignal>>
}

export type PersonClassification = {
  status: string
  primaryFamily?: string
  secondaryFamilies?: string[]
  level?: number
  evidence?: string
  source?: string
}

export type OverallPerson = {
  function: PersonClassification
  seniority: PersonClassification
  classifier: string
  otherAssessments: { framework: string; notUsed: string }[]
}

export type JobComponentsV1 = {
  status: "ok"
  goalAlignment: GoalAlignmentComponent
  experienceMatch: ExperienceMatchComponent
  composite: CompositeResult
}

export type JobOverall = {
  status: "ok"
  goalAlignment: GoalAlignmentComponent
  overall: OverallResult
}

export type JobComponents = JobComponentsV1 | JobOverall | { status: "not_found" }

export type FitComponentsResponse = {
  /** v1: behavioural/goalAlignment/experienceMatch. Overall: the five signals. */
  weights: Record<string, number>
  engineVersion: string
  jobs: Record<string, JobComponents>
  /** FIT-3: present (and "overall") only while the overall_fit switch is on. */
  mode?: "overall"
  person?: OverallPerson
  benchmarksValidated?: boolean
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
