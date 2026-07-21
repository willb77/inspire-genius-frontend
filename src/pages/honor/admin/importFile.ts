// The Honor Foundation — Administration bulk-import helpers.
//
// A robust RFC-4180-ish CSV parser (mirrors the GRANT coach importer — quoted
// fields, embedded commas, doubled quotes, CR/CRLF) plus template generation.
// The repo already ships the `xlsx` library, so we also accept .xlsx uploads and
// offer an .xlsx template alongside the CSV one. No papaparse — the CSV path is
// hand-rolled and unit-testable without React.

import * as XLSX from "xlsx"

/** Coach import columns, in template order. */
export const COACH_HEADERS = ["first_name", "last_name", "email", "role"] as const
/** Fellow import columns, in template order (reuses the live students/import). */
export const FELLOW_HEADERS = ["first_name", "last_name", "email", "cohort"] as const

export type ImportKind = "coach" | "fellow"

export const HEADERS_BY_KIND: Record<ImportKind, readonly string[]> = {
  coach: COACH_HEADERS,
  fellow: FELLOW_HEADERS,
}

const SAMPLE_BY_KIND: Record<ImportKind, string[]> = {
  coach: ["Jordan", "Morales", "j.morales@honor.org", "coach"],
  fellow: ["Marcus", "Reyes", "marcus.reyes@honor.org", "Cohort 2026-A"],
}

/** A parsed import row: only known, non-empty columns are kept. */
export type ImportRecord = Record<string, string>

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
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/**
 * Map a parsed matrix to import records for the given kind. The first non-empty
 * line is the header (matched case-insensitively against the kind's columns);
 * fully-blank lines are skipped and blank cells omitted. `first_name` is always
 * present (defaulted to "") so a missing-name row can be flagged.
 */
export function matrixToRecords(matrix: string[][], kind: ImportKind): ImportRecord[] {
  const allowed = new Set<string>(HEADERS_BY_KIND[kind])
  const nonEmpty = matrix.filter((r) => r.some((c) => c.trim() !== ""))
  if (nonEmpty.length < 1) return []

  const [header, ...body] = nonEmpty
  const cols = header.map((h) => h.trim().toLowerCase())

  return body.map((cells) => {
    const rec: ImportRecord = {}
    cols.forEach((col, idx) => {
      const value = (cells[idx] ?? "").trim()
      if (value && allowed.has(col)) rec[col] = value
    })
    return { first_name: "", ...rec }
  })
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}

/** Parse a .xlsx/.xls workbook's first sheet into import records for the kind. */
export async function parseWorkbook(file: File, kind: ImportKind): Promise<ImportRecord[]> {
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error("Spreadsheet has no sheets")
  const sheet = workbook.Sheets[sheetName]
  // Read as a matrix (header:1) so we can reuse matrixToRecords' header logic.
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false, raw: false })
  const stringMatrix = matrix.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? "" : String(c))) : []))
  return matrixToRecords(stringMatrix, kind)
}

/** Parse any supported import file (.csv / .xlsx / .xls) into records. */
export async function parseImportFile(file: File, kind: ImportKind): Promise<ImportRecord[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "xlsx" || ext === "xls") return parseWorkbook(file, kind)
  const text = await file.text()
  return matrixToRecords(parseCsv(text), kind)
}

/** A downloadable data: URI for a blank CSV template (header + one sample row). */
export function csvTemplateDataUri(kind: ImportKind): string {
  const header = HEADERS_BY_KIND[kind].join(",")
  const sample = SAMPLE_BY_KIND[kind].join(",")
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${header}\n${sample}\n`)}`
}

/** Build an .xlsx template workbook (header + one sample row) as a Blob. */
export function xlsxTemplateBlob(kind: ImportKind): Blob {
  const headers = HEADERS_BY_KIND[kind]
  const rows: string[][] = [[...headers], [...SAMPLE_BY_KIND[kind]]]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, kind === "coach" ? "Coaches" : "Fellows")
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
