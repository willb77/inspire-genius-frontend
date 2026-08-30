// GRANT coach — client-side CSV helpers (no npm dependency).
//
// A small, robust RFC-4180-ish parser (handles quoted fields, embedded commas,
// escaped quotes, and CRLF/CR line endings) plus the mapping into the frozen
// CoachStudentImportRow shape. Kept out of the modal component so the
// react-refresh/only-export-components rule stays satisfied and the parser is
// unit-testable without React.

import type { CoachStudentImportRow } from "@/types/grant/coach"

/** The canonical import columns, in template order. */
export const CSV_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "state",
  "grade_level",
  "intended_field",
  "household_income_range",
  "dob",
] as const

type CsvHeader = (typeof CSV_HEADERS)[number]

const HEADER_SET = new Set<string>(CSV_HEADERS)

/**
 * Parse CSV text into a matrix of string cells. Quoted fields may contain
 * commas, newlines, and doubled quotes ("") which decode to a literal quote.
 */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += c
      i += 1
      continue
    }
    if (c === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (c === ",") {
      row.push(field)
      field = ""
      i += 1
      continue
    }
    if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      i += 1
      continue
    }
    field += c
    i += 1
  }
  // flush the trailing field/row (files without a final newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/**
 * Map a parsed CSV matrix to import rows. The first non-empty line is the header
 * (matched case-insensitively against CSV_HEADERS). Fully-blank lines are
 * skipped and blank cells are omitted, so only answered fields are sent.
 */
export function rowsToImport(matrix: string[][]): CoachStudentImportRow[] {
  const nonEmpty = matrix.filter((r) => r.some((c) => c.trim() !== ""))
  if (nonEmpty.length < 1) return []

  const [header, ...body] = nonEmpty
  const cols = header.map((h) => h.trim().toLowerCase())

  return body.map((cells) => {
    const rec: Partial<Record<CsvHeader, string>> = {}
    cols.forEach((col, idx) => {
      const value = (cells[idx] ?? "").trim()
      if (value && HEADER_SET.has(col)) rec[col as CsvHeader] = value
    })
    // first_name is required by the contract; default to "" so the backend
    // (and the mock) can flag a missing-name row as an error.
    return { first_name: "", ...rec }
  })
}

/** Convenience: parse raw CSV text straight into import rows. */
export function parseCsvToRows(text: string): CoachStudentImportRow[] {
  return rowsToImport(parseCsv(text))
}

/** A downloadable data: URI for the blank import template (header + one sample). */
export function templateDataUri(): string {
  const header = CSV_HEADERS.join(",")
  const sample = "Jordan,Lee,jordan.lee@example.edu,CA,12,Nursing,30k_60k,2008-05-14"
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${header}\n${sample}\n`)}`
}
