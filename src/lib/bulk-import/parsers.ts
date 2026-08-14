import Papa from "papaparse"
import * as XLSX from "xlsx"
import { XMLParser } from "fast-xml-parser"
import type { RawUserRecord } from "@/types/bulk-import"

// ── Field name normalization map ──
const FIELD_ALIASES: Record<string, keyof RawUserRecord> = {
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
  primary_email: "email1",
  primaryemail: "email1",
  email2: "email2",
  secondary_email: "email2",
  secondaryemail: "email2",
  alternate_email: "email2",
  user_type: "user_type",
  usertype: "user_type",
  role: "user_type",
  type: "user_type",
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

function normalizeFieldName(name: string): string {
  const key = trimCell(name).toLowerCase().replace(/[\s-]+/g, "_")
  return (FIELD_ALIASES[key] as string) ?? key
}

function normalizeRecord(raw: Record<string, unknown>): RawUserRecord {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeFieldName(key)
    // Excel hands back numbers and Dates for non-text cells. Coercing those to
    // strings here would change the parsed shape for every downstream consumer,
    // so only strings are trimmed — a number cannot carry edge whitespace.
    result[normalized] = typeof value === "string" ? trimCell(value) : value
  }
  return result as RawUserRecord
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
        const records = (results.data as Record<string, unknown>[]).map(normalizeRecord)
        resolve(records)
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
  return data.map(normalizeRecord)
}

export async function parseJSON(file: File): Promise<RawUserRecord[]> {
  const text = await readFileAsText(file)
  const parsed = JSON.parse(text)
  const array = Array.isArray(parsed) ? parsed : parsed?.users
  if (!Array.isArray(array)) {
    throw new Error("JSON must be an array or have a \"users\" array property")
  }
  return array.map((item: Record<string, unknown>) => normalizeRecord(item))
}

export async function parseXML(file: File): Promise<RawUserRecord[]> {
  const text = await readFileAsText(file)
  const parser = new XMLParser({ ignoreAttributes: true, isArray: (name) => name === "user" })
  const result = parser.parse(text)
  const users = result?.users?.user
  if (!Array.isArray(users)) {
    throw new Error("XML must have <users><user>...</user></users> structure")
  }
  return users.map((item: Record<string, unknown>) => normalizeRecord(item))
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
