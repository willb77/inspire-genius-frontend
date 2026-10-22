import type { Tone } from "./fit"
import type {
  ComponentKey,
  ExperienceMatchComponent,
  GoalAlignmentComponent,
  GoalVerdict,
  JobComponents,
  JobComponentsV1,
  JobOverall,
  OverallSignal,
  OverallSignalKey,
} from "@/types/job-fit/components"

/** The v1 shape of one role's components (the composite), else undefined. */
export function asV1(job: JobComponents | undefined): JobComponentsV1 | undefined {
  return job && job.status === "ok" && "composite" in job ? job : undefined
}

/** FIT-3: one role's Overall fit, else undefined (switch off, or not found). */
export function asOverall(job: JobComponents | undefined): JobOverall | undefined {
  return job && job.status === "ok" && "overall" in job ? job : undefined
}

/** FIT-3 — the five signals, in the order they are weighed. */
export const OVERALL_SIGNALS: OverallSignalKey[] = ["prism", "function", "seniority", "skills", "goal"]

export const OVERALL_LABEL: Record<OverallSignalKey, string> = {
  prism: "PRISM fit",
  function: "Your field",
  seniority: "Your level",
  skills: "Your experience",
  goal: "Your goals",
}

/** The level table's names (agent-engine components.LEVEL_NAMES). */
export const LEVEL_NAME: Record<number, string> = {
  1: "entry",
  2: "associate / specialist",
  3: "senior / lead",
  4: "manager / head",
  5: "director",
  6: "VP / chief",
}

/** Why a signal is absent — said out loud, never a zero. */
export function overallAbsentReason(key: OverallSignalKey, s: OverallSignal | undefined): string {
  const status = s?.status ?? "missing"
  switch (status) {
    case "no_prism":
      return "Complete PRISM to see your PRISM fit."
    case "not_set_up":
      return "Not set up on this service yet."
    case "role_unmapped":
      return "This role isn't linked to a career field yet."
    case "role_unlevelled":
      return "This role's title doesn't name a level."
    case "no_activities":
      return "This role doesn't list its critical activities yet."
    case "no_resume":
      return "Add your résumé to see how your experience covers this role's activities."
    case "no_goals":
      return "You haven't published any goals yet."
    case "no_mapped_goal":
      return "None of your goals names a career field we can match yet."
    case "no_input":
    case "unclassified":
      return key === "seniority"
        ? "We couldn't read a level from your résumé or profile."
        : "We couldn't read your field from your résumé or profile."
    default:
      return "Not known yet."
  }
}

/** Plain labels for the three components, in the order they are weighed. */
export const COMPONENT_LABEL: Record<ComponentKey, string> = {
  behavioural: "Behavioural fit",
  goalAlignment: "Fits your goals",
  experienceMatch: "Your experience",
}

export const VERDICT_LABEL: Record<GoalVerdict, string> = {
  supported: "Supports your goals",
  mixed: "Mixed for your goals",
  "at-tension": "Pulls against your goals",
}

export const VERDICT_TONE: Record<GoalVerdict, Tone> = {
  supported: "green",
  mixed: "amber",
  "at-tension": "red",
}

/** Why a goal-alignment component is absent — said out loud, never a zero. */
export function goalAbsentReason(c: GoalAlignmentComponent): string | null {
  switch (c.status) {
    case "scored":
      return null
    case "unmapped":
      return "This role isn't linked to a career family yet, so it can't be read against your goals."
    case "no_linked_goal":
      return `None of your published goals point toward ${c.family ?? "this kind of role"}.`
    case "unscored":
      return "Complete PRISM to see how this role sits with your goals."
  }
}

export function experienceAbsentReason(c: ExperienceMatchComponent): string | null {
  switch (c.status) {
    case "scored":
      return null
    case "no_resume":
      return "Add your résumé to see how your experience covers this role's activities."
    case "no_activities":
      return "This role doesn't list its critical activities yet."
  }
}

/** Order for "Sort by my goals": supported → mixed → not linked → at-tension. */
export function goalSortRank(c: GoalAlignmentComponent | undefined): number {
  if (!c || c.status !== "scored") return 2
  return { supported: 0, mixed: 1, "at-tension": 3 }[c.verdict]
}

/** FIT-3 — how the list is ordered while Overall fit is on (owner, Q1: option A). */
export type ListOrder = "overall" | "prism"

/** A per-viewer convenience, never a gate: storage can be absent or throw. */
const ORDER_KEY = "jobfit.listOrder"

export function readOrder(): ListOrder {
  try {
    return window.localStorage.getItem(ORDER_KEY) === "prism" ? "prism" : "overall"
  } catch {
    return "overall"
  }
}

export function writeOrder(order: ListOrder) {
  try {
    window.localStorage.setItem(ORDER_KEY, order)
  } catch {
    // a private window or blocked storage: the choice simply isn't remembered
  }
}

/**
 * FIT-3 — order by Overall fit (default) or by PRISM fit (the order the server
 * served). Rows with no Overall fit go after the scored ones, in PRISM order.
 * Applied here, in the person's own browser: the server's order and the
 * snapshot a manager's view reads are never touched.
 */
export function orderRows<T extends { jobId: string }>(
  rows: T[],
  jobs: Record<string, JobComponents> | undefined,
  order: ListOrder,
): T[] {
  if (order === "prism" || !jobs) return rows
  return rows
    .map((m, i) => ({ m, i, s: asOverall(jobs[m.jobId])?.overall.score ?? null }))
    .sort((a, b) => {
      if (a.s == null && b.s == null) return a.i - b.i
      if (a.s == null) return 1
      if (b.s == null) return -1
      return b.s - a.s || a.i - b.i
    })
    .map(({ m }) => m)
}
