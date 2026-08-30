import { bulkUserSchema } from "@/types/bulk-import"
import type { RawUserRecord, ValidationResult, ValidationError, BulkUserRecord } from "@/types/bulk-import"
import { HEADER_MAPPING_KEY, type HeaderMapping } from "@/lib/bulk-import/parsers"

/** Pull the parser's header report off the batch. Absent when records were
 *  hand-built rather than parsed from a file, so every field is optional. */
function readHeaderMapping(records: RawUserRecord[]): HeaderMapping {
  const raw = records[0]?.[HEADER_MAPPING_KEY] as Partial<HeaderMapping> | undefined
  return { inferred: raw?.inferred ?? {}, ignored: raw?.ignored ?? [] }
}

type CallerRole = "manager" | "company-admin" | "super-admin"

/** Roles that each caller role is NOT allowed to create */
const DISALLOWED_ROLES: Record<CallerRole, string[]> = {
  manager: ["company-admin", "super-admin"],
  "company-admin": ["super-admin"],
  "super-admin": [],
}

export function validateRecords(
  records: RawUserRecord[],
  callerRole: CallerRole = "super-admin",
): ValidationResult {
  const headerMapping = readHeaderMapping(records)
  const result: ValidationResult = {
    valid: [],
    invalid: [],
    duplicates: [],
    ignoredColumns: headerMapping.ignored,
    inferredColumns: Object.entries(headerMapping.inferred).map(([field, header]) => ({
      field,
      header,
    })),
  }
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
    const disallowed = DISALLOWED_ROLES[callerRole]
    if (disallowed.includes(record.user_type as string)) {
      const roleLabel = callerRole === "manager" ? "Managers" : "Company admins"
      errors.push({
        row,
        field: "user_type",
        message: `${roleLabel} cannot create ${record.user_type} users`,
      })
    }

    // Reporting line — a cycle of length one. Postgres accepts it (manager_id
    // is just an FK to a profile), the roster then lists the person under
    // themselves, and nothing anywhere reports an error. Caught here because
    // this is the only layer that can point at the offending row.
    const managerEmail = (record.manager_email ?? "").toLowerCase().trim()
    if (managerEmail && managerEmail === (record.email1 ?? "").toLowerCase().trim()) {
      errors.push({
        row,
        field: "manager_email",
        message: "A user cannot report to themselves",
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

  const disallowed = DISALLOWED_ROLES[callerRole]
  if (disallowed.includes(record.user_type as string)) {
    const roleLabel = callerRole === "manager" ? "Managers" : "Company admins"
    errors.push({ row: 0, field: "user_type", message: `${roleLabel} cannot create ${record.user_type} users` })
  }

  const managerEmail = (record.manager_email ?? "").toLowerCase().trim()
  if (managerEmail && managerEmail === (record.email1 ?? "").toLowerCase().trim()) {
    errors.push({ row: 0, field: "manager_email", message: "A user cannot report to themselves" })
  }

  return errors
}
