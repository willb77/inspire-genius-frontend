import type { Tone } from "./_fit"
import type {
  ComponentKey,
  ExperienceMatchComponent,
  GoalAlignmentComponent,
  GoalVerdict,
} from "@/types/job-fit/components"

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
