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

export type OrganizationOptions = {
  /** Organisations a super-admin can assign (`useOrgDirectory`). Undefined
   *  while it loads or if it failed — a name then cannot be checked. */
  orgDirectory?: { id: string; name: string }[]
  /** Whether this import path applies a per-row organisation. Only Skip
   *  onboarding does (auth-service bulk invite); the standard path
   *  (user-service) puts every row in the importer's own organisation, so an
   *  organisation sent there would be dropped without a word. Defaults to
   *  false, so a caller that does not say is refused rather than ignored. */
  organizationAllowed?: boolean
  /** N-2: whether this importer may record roster dates of birth — the
   *  server's `rosterAgeCapture`, true only while under-18 support is on for
   *  the importer. Defaults to false: a Date of birth column is then reported
   *  as ignored and never sent, which is what happens to it today. */
  ageCaptureAllowed?: boolean
}

/** The label a Date of birth column is reported under when it is not used. */
export const DATE_OF_BIRTH_LABEL = "Date of birth"

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

/** A real calendar date as ISO, or null. Never rolls an impossible date over. */
function toIsoDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return d.toISOString().slice(0, 10)
}

/** True when the row carries anything at all in its Date of birth column. */
function hasDateOfBirth(record: RawUserRecord): boolean {
  const raw = record.date_of_birth
  if (raw === undefined || raw === null) return false
  return typeof raw === "string" ? raw.trim() !== "" : true
}

/**
 * N-2: a row's date of birth, normalised to `YYYY-MM-DD`, or why not.
 *
 * Accepted as `YYYY-MM-DD` or US `MM/DD/YYYY`. Not in the future, not before
 * 1900. An unreadable date fails on a row the operator can see: a student whose
 * date silently failed to record would be ungated without anyone knowing.
 * With capture not allowed the value is dropped, never sent.
 */
export function resolveDateOfBirth(
  record: RawUserRecord,
  options: OrganizationOptions,
  today: Date = new Date(),
): { value?: string; error?: string } {
  if (!hasDateOfBirth(record) || !options.ageCaptureAllowed) return {}
  const raw = record.date_of_birth
  const typed = typeof raw === "string" ? raw.trim() : ""
  let iso: string | null = null
  const isoMatch = ISO_DATE.exec(typed)
  const usMatch = US_DATE.exec(typed)
  if (isoMatch) iso = toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
  else if (usMatch) iso = toIsoDate(Number(usMatch[3]), Number(usMatch[1]), Number(usMatch[2]))
  if (!iso) return { error: "Date of birth must be a real date written YYYY-MM-DD or MM/DD/YYYY" }
  if (iso > today.toISOString().slice(0, 10)) return { error: "Date of birth cannot be in the future" }
  if (iso < "1900-01-01") return { error: "Date of birth is not a plausible birth date" }
  return { value: iso }
}

/** Case- and spacing-insensitive, so "Test-Org-A " matches "test-org-a". */
function normaliseOrgName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase()
}

/**
 * Resolve a row's Organization NAME to an organisation id, or say why not.
 *
 * Only a super-admin import acts on the column. For other callers it stays
 * what it was before the column existed — ignored, and reported as ignored —
 * since neither backend lets them import at all.
 *
 * Exact match after normalising, and never a guess: duplicate organisation
 * names are not blocked when an organisation is created, so two matches are
 * refused rather than resolved to whichever comes first.
 */
function resolveOrganization(
  record: RawUserRecord,
  callerRole: CallerRole,
  options: OrganizationOptions,
): { organizationId?: string; error?: string } {
  const typed = typeof record.organization === "string" ? record.organization.trim() : ""
  if (!typed || callerRole !== "super-admin") return {}
  if (!options.organizationAllowed) {
    return {
      error:
        "Organization is applied only with 'Skip onboarding for this batch'. Go back, tick it and " +
        "upload again, or clear this cell.",
    }
  }
  if (!options.orgDirectory) {
    return {
      error:
        "The organization list has not loaded, so this name cannot be checked. Wait a moment, " +
        "then click Revalidate All.",
    }
  }
  const wanted = normaliseOrgName(typed)
  const matches = options.orgDirectory.filter((o) => normaliseOrgName(o.name) === wanted)
  if (matches.length === 0) {
    return {
      error: `No organization is named "${typed}". Create it under Organizations first, or fix the name.`,
    }
  }
  if (matches.length > 1) {
    return {
      error: `${matches.length} organizations are named "${typed}". Rename all but one under Organizations, then Revalidate All.`,
    }
  }
  return { organizationId: matches[0].id }
}

/** Roles that each caller role is NOT allowed to create */
const DISALLOWED_ROLES: Record<CallerRole, string[]> = {
  manager: ["company-admin", "super-admin"],
  "company-admin": ["super-admin"],
  "super-admin": [],
}

export function validateRecords(
  records: RawUserRecord[],
  callerRole: CallerRole = "super-admin",
  options: OrganizationOptions = {},
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

    // Organisation — a name typed in the file, resolved to an id here so a
    // wrong name fails on a visible row, not as a user in no organisation.
    const org = resolveOrganization(record, callerRole, options)
    if (org.error) {
      errors.push({ row, field: "organization", message: org.error })
    }

    const dob = resolveDateOfBirth(record, options)
    if (dob.error) {
      errors.push({ row, field: "date_of_birth", message: dob.error })
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
      const valid = parsed.data as BulkUserRecord
      if (org.organizationId) valid.organization_id = org.organizationId
      if (dob.value) valid.date_of_birth = dob.value
      else delete valid.date_of_birth
      result.valid.push({ row, record: valid })
    }
  }

  // Not acted on for this caller (see resolveOrganization), so say so in the
  // same notice that lists every other ignored column.
  if (
    callerRole !== "super-admin" &&
    records.some((r) => typeof r.organization === "string" && r.organization.trim()) &&
    !result.ignoredColumns.includes("Organization")
  ) {
    result.ignoredColumns = [...result.ignoredColumns, "Organization"]
  }

  // N-2: a Date of birth column is used only while capture is allowed; until
  // then it is reported as ignored, as it was before the column was known.
  if (
    !options.ageCaptureAllowed &&
    records.some(hasDateOfBirth) &&
    !result.ignoredColumns.includes(DATE_OF_BIRTH_LABEL)
  ) {
    result.ignoredColumns = [...result.ignoredColumns, DATE_OF_BIRTH_LABEL]
  }

  return result
}

export function revalidateRecord(
  record: RawUserRecord,
  callerRole: CallerRole = "super-admin",
  options: OrganizationOptions = {},
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

  const org = resolveOrganization(record, callerRole, options)
  if (org.error) {
    errors.push({ row: 0, field: "organization", message: org.error })
  }

  const dob = resolveDateOfBirth(record, options)
  if (dob.error) {
    errors.push({ row: 0, field: "date_of_birth", message: dob.error })
  }

  return errors
}
