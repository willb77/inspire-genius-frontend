import type { ChatJob } from "@/hooks/agents/useMeridianJob"
import type { ExerciseTurnMeta } from "@/types/career-exercise/student"

/** The surface the server reads to load the caller's own exercise (CX-2). */
export const EXERCISE_SURFACE = "career_exercise"

/** True when the exercise's guardrails (CX-3) sent this turn to the counselor:
 * `metadata.career_exercise.next === "counselor"`. */
export function turnSendsToCounselor(job: Pick<ChatJob, "metadata"> | null | undefined): boolean {
  const meta = job?.metadata?.career_exercise as ExerciseTurnMeta | undefined
  return !!meta && typeof meta === "object" && meta.next === "counselor"
}
