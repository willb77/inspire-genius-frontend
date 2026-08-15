import { z } from "zod"

// ── Raw record from file parsing (before validation) ──
export type RawUserRecord = {
  fname?: string
  lname?: string
  email1?: string
  email2?: string
  user_type?: string
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
}

export type BulkImportResponse = {
  batch_id: string
  total: number
  succeeded: number
  failed: number
  results: ImportRowResult[]
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
}
