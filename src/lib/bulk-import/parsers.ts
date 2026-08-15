import Papa from "papaparse"
import * as XLSX from "xlsx"
import { XMLParser } from "fast-xml-parser"
import type { RawUserRecord } from "@/types/bulk-import"

// ── Field name normalization map ──
const FIELD_ALIASES: Record<string, KnownField> = {
  first_name: "fname",
  firstname: "fname",
  first: "fname",
  fname: "fname",
  last_name: "lname",
  lastname: "lname",
  last: "lname",
  lname: "lname",
  email: "email1",
  email1: "email1",
  e_mail: "email1",
  mail: "email1",
  gmail: "email1",
  email_address: "email1",
  emailaddress: "email1",
  primary_email: "email1",
  primaryemail: "email1",
  student_email: "email1",
  studentemail: "email1",
  school_email: "email1",
  work_email: "email1",
  email2: "email2",
  email_2: "email2",
  e_mail_2: "email2",
  secondary_email: "email2",
  secondaryemail: "email2",
  alternate_email: "email2",
  user_type: "user_type",
  usertype: "user_type",
  role: "user_type",
  type: "user_type",
}

/** Fields the importer actually consumes. Anything else is surplus. */
export const KNOWN_FIELDS = ["fname", "lname", "email1", "email2", "user_type"] as const
export type KnownField = (typeof KNOWN_FIELDS)[number]

// ── Header inference ──
//
// Real rosters name the address column after wherever it came from: "ECPS
// Gmail", "Student Email", "School Mail". Enumerating every institution is
// hopeless, so an unrecognised header that CONTAINS an email-ish word is taken
// as the address column.
//
// This is a heuristic, so it is bounded on both sides: it only ever fills a
// slot nothing else claimed, and it is always REPORTED to the operator rather
// than applied silently (see HeaderMapping.inferred). An inference you can see
// is a convenience; one you cannot is a trap.
const EMAIL_TOKENS = new Set(["email", "emails", "mail", "gmail", "emailaddress"])

// Someone else's address must never become a student's login, so a header
// naming another party is reported as ignored rather than inferred — even
// though it plainly contains "email".
const NOT_THE_USERS_OWN = new Set([
  "parent", "parents", "guardian", "guardians", "mother", "father", "mom", "dad",
  "counselor", "counsellor", "advisor", "adviser", "teacher", "instructor",
  "emergency", "contact", "manager", "supervisor",
])

// Words that mark the secondary slot rather than the primary one.
const SECONDARY_MARKERS = new Set([
  "secondary", "alternate", "alternative", "alt", "second", "other", "backup", "2",
])

export type HeaderMapping = {
  /** field → the original header it was INFERRED from (never exact-aliased). */
  inferred: Record<string, string>
  /** Original headers, verbatim, that matched no field at all. */
  ignored: string[]
}

/** Key carrying the header report on every parsed record. Underscore-prefixed
 *  so it cannot collide with a spreadsheet column; `bulkUserSchema` strips it. */
export const HEADER_MAPPING_KEY = "__headerMapping"

function toKey(name: string): string {
  return trimCell(name).toLowerCase().replace(/[\s-]+/g, "_")
}

function inferField(key: string): "email1" | "email2" | null {
  const tokens = key.split("_").filter(Boolean)
  if (!tokens.some((t) => EMAIL_TOKENS.has(t))) return null
  if (tokens.some((t) => NOT_THE_USERS_OWN.has(t))) return null
  return tokens.some((t) => SECONDARY_MARKERS.has(t)) ? "email2" : "email1"
}

/**
 * Resolve every header in one pass so precedence is explicit: exact aliases
 * claim their field first, and inference only fills what is still empty.
 * Unrecognised headers keep their ORIGINAL spelling so the operator is told
 * about "ECPS Gmail", not about "ecps_gmail".
 */
export function mapHeaders(headers: string[]): {
  resolved: Map<string, string>
  mapping: HeaderMapping
} {
  const resolved = new Map<string, string>()
  const claimed = new Set<string>()
  const mapping: HeaderMapping = { inferred: {}, ignored: [] }

  for (const header of headers) {
    const field = FIELD_ALIASES[toKey(header)]
    if (field && !claimed.has(field)) {
      resolved.set(header, field)
      claimed.add(field)
    }
  }

  for (const header of headers) {
    if (resolved.has(header)) continue
    const field = inferField(toKey(header))
    if (field && !claimed.has(field)) {
      resolved.set(header, field)
      claimed.add(field)
      mapping.inferred[field] = trimCell(header)
    } else {
      resolved.set(header, trimCell(header))
      mapping.ignored.push(trimCell(header))
    }
  }

  return { resolved, mapping }
}

// Invisible characters that `String.prototype.trim()` does NOT remove, because
// they are not in the spec's WhiteSpace set. Spreadsheet data pasted out of a
// web page or Word routinely carries them, and because they render as nothing
// the cell looks clean while validation rejects it — "a@b.com" fails the email
// rule with no visible cause. `trim()` DOES already handle space, tab, newline,
// NBSP (U+00A0), BOM (U+FEFF) and the ideographic space (U+3000); those are
// deliberately absent here.
//
// Written as escapes, never as literal characters: these are invisible, so a
// literal would be unreviewable in a diff and deletable by accident.
const INVISIBLE_EDGE_CHARS = [
  "\\u200B", // zero-width space
  "\\u200C", // zero-width non-joiner
  "\\u200D", // zero-width joiner
  "\\u2060", // word joiner
  "\\u00AD", // soft hyphen
  "\\u180E", // Mongolian vowel separator
]
// Alternation rather than a character class: a class containing the zero-width
// JOINER trips eslint's no-misleading-character-class, because it can fuse with
// the neighbouring members into a single grapheme.
const EDGE_ATOM = `(?:\\s|${INVISIBLE_EDGE_CHARS.join("|")})`
const EDGE_JUNK = new RegExp(`^${EDGE_ATOM}+|${EDGE_ATOM}+$`, "g")

/**
 * Strip leading/trailing whitespace INCLUDING the invisible characters
 * `trim()` misses. Interior characters are left alone — this trims the ends,
 * it does not rewrite the value.
 */
export function trimCell(value: string): string {
  return value.replace(EDGE_JUNK, "")
}

/**
 * Normalize a whole sheet at once. Headers must be resolved across the full
 * set, not row by row: which slot "ECPS Gmail" claims depends on whether some
 * other column already took `email1`, and a single row cannot know that.
 */
function normalizeRecords(rows: Record<string, unknown>[]): RawUserRecord[] {
  const headers: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }

  const { resolved, mapping } = mapHeaders(headers)

  return rows.map((row) => {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      const field = resolved.get(key) ?? trimCell(key)
      // Excel hands back numbers and Dates for non-text cells. Coercing those to
      // strings here would change the parsed shape for every downstream consumer,
      // so only strings are trimmed — a number cannot carry edge whitespace.
      result[field] = typeof value === "string" ? trimCell(value) : value
    }
    result[HEADER_MAPPING_KEY] = mapping
    return result as RawUserRecord
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
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

export async function parseCSV(file: File): Promise<RawUserRecord[]> {
  const text = await readFileAsText(file)
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(normalizeRecords(results.data as Record<string, unknown>[]))
      },
      error: (error: Error) => reject(new Error(`CSV parse error: ${error.message}`)),
    })
  })
}

export async function parseExcel(file: File): Promise<RawUserRecord[]> {
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error("Excel file has no sheets")
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  return normalizeRecords(data)
}

export async function parseJSON(file: File): Promise<RawUserRecord[]> {
  const text = await readFileAsText(file)
  const parsed = JSON.parse(text)
  const array = Array.isArray(parsed) ? parsed : parsed?.users
  if (!Array.isArray(array)) {
    throw new Error("JSON must be an array or have a \"users\" array property")
  }
  return normalizeRecords(array as Record<string, unknown>[])
}

export async function parseXML(file: File): Promise<RawUserRecord[]> {
  const text = await readFileAsText(file)
  const parser = new XMLParser({ ignoreAttributes: true, isArray: (name) => name === "user" })
  const result = parser.parse(text)
  const users = result?.users?.user
  if (!Array.isArray(users)) {
    throw new Error("XML must have <users><user>...</user></users> structure")
  }
  return normalizeRecords(users as Record<string, unknown>[])
}

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? ""
}

export async function parseFile(file: File): Promise<RawUserRecord[]> {
  const ext = getExtension(file.name)
  switch (ext) {
    case "csv":
      return parseCSV(file)
    case "xlsx":
    case "xls":
      return parseExcel(file)
    case "json":
      return parseJSON(file)
    case "xml":
      return parseXML(file)
    default:
      throw new Error(`Unsupported file format: .${ext}. Supported: CSV, Excel, JSON, XML`)
  }
}

export const SUPPORTED_EXTENSIONS = ["csv", "xlsx", "xls", "json", "xml"]
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
