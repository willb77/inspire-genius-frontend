import { bulkUserSchema } from "@/types/bulk-import"
import type { RawUserRecord, ValidationResult, ValidationError, BulkUserRecord } from "@/types/bulk-import"

type CallerRole = "company-admin" | "super-admin"

export function validateRecords(
  records: RawUserRecord[],
  callerRole: CallerRole = "super-admin",
): ValidationResult {
  const result: ValidationResult = { valid: [], invalid: [], duplicates: [] }
  const emailIndex = new Map<string, number>()

  for (let i = 0; i < records.length; i++) {
    const row = i + 1
    const record = records[i]
    const errors: ValidationError[] = []

    // Zod validation
    const parsed = bulkUserSchema.safeParse(record)

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row,
          field: issue.path.join("."),
          message: issue.message,
        })
      }
    }

    // Role escalation check
    if (
      callerRole === "company-admin" &&
      record.user_type === "super-admin"
    ) {
      errors.push({
        row,
        field: "user_type",
        message: "Company admins cannot create super-admin users",
      })
    }

    // Duplicate email detection
    const email = (record.email1 ?? "").toLowerCase().trim()
    if (email) {
      const existingRow = emailIndex.get(email)
      if (existingRow !== undefined) {
        result.duplicates.push({ row, email, duplicateOf: existingRow })
        errors.push({
          row,
          field: "email1",
          message: `Duplicate email — same as row ${existingRow}`,
        })
      } else {
        emailIndex.set(email, row)
      }
    }

    if (errors.length > 0) {
      result.invalid.push({ row, record, errors })
    } else {
      result.valid.push({ row, record: parsed.data as BulkUserRecord })
    }
  }

  return result
}

export function revalidateRecord(
  record: RawUserRecord,
  callerRole: CallerRole = "super-admin",
): ValidationError[] {
  const errors: ValidationError[] = []
  const parsed = bulkUserSchema.safeParse(record)

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ row: 0, field: issue.path.join("."), message: issue.message })
    }
  }

  if (callerRole === "company-admin" && record.user_type === "super-admin") {
    errors.push({ row: 0, field: "user_type", message: "Company admins cannot create super-admin users" })
  }

  return errors
}
