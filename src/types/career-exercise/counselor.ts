/**
 * CX-6 — a counselor's view of a student's career exploration exercise
 * (`/v1/agents/career-exercise/students/{studentId}/...`).
 *
 * Field names are the server's (snake_case inside a session). The student's
 * own words are the stage-output fields; `annotations` and
 * `paths_confirmation` are the counselor layer, stored apart from them.
 */

export const EXERCISE_STAGES = [
  "welcome",
  "discover",
  "pillars",
  "explore",
  "narrow",
  "test",
  "commit",
  "close",
] as const

export type ExerciseStage = (typeof EXERCISE_STAGES)[number]

export type ExerciseStatus = "active" | "paused" | "closed"

export type RoleCard = {
  onet_soc: string
  title: string
  cluster: string
  typical_education: string | null
  wage_p25: number | null
  wage_median: number | null
  wage_p75: number | null
  wage_area: string | null
  bucket: "curious" | "maybe" | "not_for_me" | null
  reason: string | null
}

export type Experiment = {
  onet_soc: string
  kind: string
  target_date: string | null
  bridge_match_id: string | null
}

export type ExercisePaths = {
  primary: string
  backup: string
  check_in_adult?: string | null
  follow_up?: string | null
}

export type CounselorNote = {
  id: string
  kind: "note"
  stage: ExerciseStage
  text: string
  by: string
  by_role: string | null
  at: string
  session_version: number
}

export type PathsConfirmationEntry = {
  id: string
  kind: "confirm_paths"
  paths: { primary: string; backup: string }
  by: string
  by_role: string | null
  at: string
  session_version: number
}

export type Annotation = CounselorNote | PathsConfirmationEntry

export type PathsConfirmation = {
  by: string
  by_role: string | null
  at: string | null
  paths: { primary: string; backup: string } | null
  /** False when the student changed their paths after this confirmation. */
  current: boolean
}

export type ExerciseSession = {
  session_id: string
  student_id: string
  tenant_id: string | null
  stage: ExerciseStage
  status: ExerciseStatus
  version: number
  updated_at: string
  self_portrait: string | null
  profile_reactions: string[]
  pillars: Record<string, string[]>
  roles: RoleCard[]
  posting_reaction: Record<string, string[]>
  experiments: Experiment[]
  paths: ExercisePaths | null
  annotations: Annotation[]
  paths_confirmation: PathsConfirmation | null
}

export type StudentSessions = {
  studentId: string
  sessions: ExerciseSession[]
}

export type AddNoteIn = { stage: ExerciseStage; text: string }

export type CounselorWriteOut = { studentId: string; session: ExerciseSession }
