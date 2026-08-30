// GRANT vertical — Coach roster contract (P3 roster/import + P4 convert-to-IG).
//
// A practitioner / coach / super-admin manages a roster of students they are
// building aid profiles FOR. Each student opens into the EXISTING aid
// questionnaire bound to their id, and can be converted into their own IG login
// (invite) while the coach keeps co-access.
//
// Mirrors the frozen backend contract under /v1/agents/grant/coach/students.

/** Lifecycle of a coach-managed student. */
export type CoachStudentStatus = "managed" | "invited" | "linked"

/** One student on the coach's roster (GET /coach/students). */
export type CoachStudent = {
  id: string
  fullName: string
  email: string | null
  stateOfResidence: string
  gradeLevel: string | null
  status: CoachStudentStatus
  /** Aid-profile completeness, 0–100. */
  completeness: number
  /** True once the five trigger fields are answered (mirrors ready_to_search). */
  readyToSearch: boolean
  /** ISO-8601 timestamp of the last profile update. */
  updatedAt: string
}

/** Body for POST /coach/students (single add). */
export type CoachStudentCreate = {
  firstName: string
  lastName?: string
  email?: string
  state?: string
  gradeLevel?: string
  intendedField?: string
  householdIncomeRange?: string
  dob?: string
}

/** One parsed CSV row for POST /coach/students/import. Only first_name is required. */
export type CoachStudentImportRow = {
  first_name: string
  last_name?: string
  email?: string
  state?: string
  grade_level?: string
  intended_field?: string
  household_income_range?: string
  dob?: string
}

/** Per-row outcome from the bulk import. */
export type ImportRowResult = {
  /** 1-based row number in the uploaded file. */
  row: number
  status: "created" | "duplicate" | "error"
  studentId?: string
  name?: string
  message?: string
}

/** Aggregate result of POST /coach/students/import. */
export type CoachImportResult = {
  created: number
  duplicates: number
  errors: number
  results: ImportRowResult[]
}

/** Result of POST /coach/students/{id}/invite. */
export type InviteStudentResult = {
  status: "invited" | "linked" | "noop"
  studentId: string
  message: string
}

/** Per-student outcome from POST /coach/students/invite-bulk. */
export type BulkInviteRowResult = {
  studentId: string
  status: "invited" | "linked" | "noop" | "forbidden" | "skipped" | "error"
  /** Set when the invite created a newly-linked student id. */
  newStudentId?: string
  message?: string
}

/** Aggregate result of POST /coach/students/invite-bulk. */
export type BulkInviteResult = {
  converted: number
  skipped: number
  errors: number
  results: BulkInviteRowResult[]
}

/** Result of DELETE /coach/students/{id}. */
export type RemoveStudentResult = { removed: true }
