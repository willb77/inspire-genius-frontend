/**
 * CX-5 — the student's own career exploration exercise
 * (`/v1/agents/career-exercise/sessions/...`). The session shape is the one
 * CX-6 already typed (the server's own field names); this file adds only what
 * the student's routes answer with.
 */
import type { ExerciseSession, RoleCard } from "@/types/career-exercise/counselor"
import type { OccupationDetail, OccupationPay, OccupationRead } from "@/types/job-fit/occupations"

export type { ExerciseSession, RoleCard }

export type MySessions = { sessions: ExerciseSession[] }

export type StartOut = { session: ExerciseSession; created: boolean }

export type SessionOut = { session: ExerciseSession }

/** OD-4's pay read also carries `asOf` (the OEWS vintage code). */
export type PayWithVintage = OccupationPay & { asOf?: string | null }

/** What the reply metadata carries on the `career_exercise` surface (CX-2/CX-3). */
export type ExerciseTurnMeta = {
  session_id?: string
  stage_before?: string
  stage_after?: string
  guardrail?: string
  /** `"counselor"` when CX-3 blocked or held the turn. */
  next?: string
}

/**
 * One worksheet cell for a role's pay or education. A figure is only ever a
 * `value` with its area and vintage; anything less is a `reason` (never a
 * number) or `pending` while the data year is being checked.
 */
export type FactCell =
  | { kind: "value"; text: string; area: string; vintage: string }
  | { kind: "reason"; text: string }
  | { kind: "pending"; text: string }

export type RoleFactCells = { pay: FactCell; education: FactCell }

/** One OD-4 read as the page sees it. */
export type ReadState<T> = {
  status: "pending" | "error" | "success"
  data: OccupationRead<T> | undefined
}

export type RoleFactReads = { pay: ReadState<PayWithVintage>; education: ReadState<OccupationDetail> }
