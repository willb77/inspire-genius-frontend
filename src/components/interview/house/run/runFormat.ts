/**
 * House style S4b — the plain helpers the one interview build shares.
 *
 * Copied verbatim from LiveInterviewBody / StudioInterviewBody. Those two
 * bodies stay untouched and render whenever the interview switch is off; the
 * side-by-side tests in `__tests__/sideBySide.test.tsx` prove the write-up
 * this build renders is the same markup they render.
 */
import type { InterviewKind } from "@/services/interview/studio.service"
import type { InterviewStep } from "@/types/job-blueprint"
import { englishT, type TFn } from "@/components/interview/tFallback"

/**
 * The three kinds a person picks from.
 *   - hiring:      today's Live Interview — the standard question bank, scored.
 *   - own:         today's Interview Studio, selection style — your own questions.
 *   - development: today's Interview Studio, development style — no hiring verdict.
 */
export type RunKind = "hiring" | "own" | "development"

/**
 * Where the questions come from, which decides every request body and the
 * write-up: `star` is Live's path, `custom` is Studio's.
 */
export type RunSource = "star" | "custom"

export const kindOptions = (t: TFn = englishT): { value: RunKind; label: string; hint: string }[] => [
  { value: "hiring", label: t("house.kind.hiring", "Hiring"), hint: t("house.kind.hiringHint", "Standard questions for a role, scored.") },
  { value: "own", label: t("house.kind.own", "Your own questions"), hint: t("house.kind.ownHint", "Write them, upload them, or have them suggested from a topic.") },
  {
    value: "development",
    label: t("house.kind.development", "Development conversation"),
    hint: t("house.kind.developmentHint", "No hiring verdict. Can be saved to the person's record."),
  },
]

export function sourceOf(kind: RunKind): RunSource {
  return kind === "hiring" ? "star" : "custom"
}

/** The Studio builder's style for a kind (it has two: selection and development). */
export function builderKindOf(kind: RunKind): InterviewKind {
  return kind === "development" ? "general" : "hiring"
}

/** The kind a stored session belongs to, read from its frame. */
export function kindOfFrame(frame: { mode?: string; kind?: string } | null | undefined): RunKind {
  if (frame?.mode !== "custom") return "hiring"
  return frame?.kind === "general" ? "development" : "own"
}

/** Format a score that may arrive as a number, a numeric string, or null. */
export function fmtScore(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "—"
}

/** JS-12 — what happened to the linked candidate's pipeline step. */
export type PipelineStepOutcome = {
  step: InterviewStep
  outcome: "moved" | "unchanged" | "failed"
  /** The status the server holds (unchanged), or the failure reason. */
  detail?: string
}

export function stepLabel(step: InterviewStep, t: TFn = englishT): string {
  return step === "interview-scheduled"
    ? t("live.step.scheduled", "interview scheduled")
    : t("live.step.completed", "interview completed")
}

/** Turn the step write's failure into one sentence the interviewer can act on. */
export function stepFailureReason(e: unknown, t: TFn = englishT): string {
  const status = (e as { response?: { status?: number } } | undefined)?.response?.status
  if (status === 404) return t("live.failure.notFound", "the pipeline service does not have the interview-step route yet")
  if (status === 403) return t("live.failure.forbidden", "this account is not entitled to write the candidate pipeline")
  if (status === 422) return t("live.failure.rejected", "the pipeline service rejected the step")
  return e instanceof Error && e.message ? e.message : t("live.failure.requestFailed", "the request failed")
}
