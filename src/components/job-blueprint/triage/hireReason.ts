import type { PipelineStep } from "@/types/job-blueprint"

/**
 * The server moves a candidate one step at a time; the step after
 * `interview-completed` is `hired`, and that move needs a reason (BP-F4,
 * owner decision 3 — `POST /v1/blueprint/triage/advance/:id` answers 400
 * without one). Every other step advances with no prompt, as before.
 */
export function advanceNeedsReason(status: PipelineStep | string | undefined): boolean {
  return status === "interview-completed"
}
