import { z } from "zod"

// ── Raw record from file parsing (before validation) ──
export type RawUserRecord = {
  fname?: string
  lname?: string
  email1?: string
  email2?: string
  user_type?: string
  manager_email?: string
  department?: string
  position?: string
  [key: string]: unknown
}

// ── Validated record ──
export const bulkUserSchema = z.object({
  fname: z.string().min(1, "First name is required").max(100),
  lname: z.string().min(1, "Last name is required").max(100),
  email1: z.string().email("Invalid email format"),
  email2: z.string().email("Invalid email format").optional().or(z.literal("")),
  user_type: z.enum(["user", "manager", "company-admin", "super-admin"], {
    message: "Must be one of: user, manager, company-admin, super-admin",
  }),
  /**
   * The manager this person reports to, by email. Optional — a file without
   * the column imports exactly as before — but it is what makes the imported
   * user appear on a manager's roster and in Team Development: the backend
   * resolves it to that manager's profile and writes
   * `employee_profiles.manager_id`. Without it the user belongs to nobody and
   * every manager surface renders empty.
   *
   * Validated as an email so a typo fails HERE, on a row the operator can see
   * and fix, rather than server-side as a silently unassigned user.
   */
  manager_email: z.string().email("Manager must be a valid email address").optional().or(z.literal("")),
  department: z.string().max(128).optional().or(z.literal("")),
  position: z.string().max(128).optional().or(z.literal("")),
})

export type BulkUserRecord = z.infer<typeof bulkUserSchema>

// ── Validation types ──
export type ValidationError = {
  row: number
  field: string
  message: string
}

export type ValidationResult = {
  valid: { row: number; record: BulkUserRecord }[]
  invalid: { row: number; record: RawUserRecord; errors: ValidationError[] }[]
  duplicates: { row: number; email: string; duplicateOf: number }[]
  /**
   * Columns in the uploaded file that matched no known field, verbatim as the
   * operator spelled them. Silently dropping these is what turns "my email
   * column is called ECPS Gmail" into 33 rows of "email1: expected string,
   * received undefined" — an error naming a field they never typed.
   */
  ignoredColumns: string[]
  /** Columns matched by inference rather than an exact alias, so the operator
   *  can see and correct a wrong guess. */
  inferredColumns: { field: string; header: string }[]
}

// ── Import types ──
export type ImportRowResult = {
  email: string
  status: "success" | "failed"
  error?: string
  user_id?: string
  /** Outcome of the reporting-line write: "linked", or the reason it was not
   *  applied. Absent when the row carried no Manager / Department / Position. */
  employment?: string | null
}

export type BulkImportResponse = {
  batch_id: string
  total: number
  succeeded: number
  failed: number
  results: ImportRowResult[]
  /** Rows whose reporting line was actually written. Shown alongside
   *  `succeeded` because "50 imported, 0 attached to a manager" is the failure
   *  the Manager column exists to prevent, and one number cannot show it. */
  employment_linked?: number
}

export type BulkImportStatusResponse = {
  batch_id: string
  status: "processing" | "completed" | "failed"
  progress: number
  total: number
  results: ImportRowResult[]
}

// ── Invitation types ──
export type InvitationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "failed"

export type InvitationRecord = {
  invite_id: string
  batch_id: string
  recipient_email: string
  recipient_name: string
  role: string
  status: InvitationStatus
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  error?: string
}

export type SendBulkInvitationsPayload = {
  batch_id: string
  user_ids: string[]
  custom_message: string
}

export type SendBulkResponse = {
  batch_id: string
  invitation_batch_id: string
  total: number
  queued: number
}

export type InvitationStatusResponse = {
  batch_id: string
  invitations: InvitationRecord[]
  summary: {
    total: number
    queued: number
    sent: number
    delivered: number
    opened: number
    failed: number
  }
}

// ── Stepper workflow state ──
export type BulkImportStep =
  | "upload"
  | "validate"
  | "import"
  | "compose"
  | "send"
  | "track"

export type ImportedUser = {
  user_id: string
  fname: string
  lname: string
  email1: string
  email2?: string
  user_type: string
  manager_email?: string
  department?: string
  position?: string
}
