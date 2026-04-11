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

function normalizeFieldName(name: string): string {
  const key = name.trim().toLowerCase().replace(/[\s-]+/g, "_")
  return (FIELD_ALIASES[key] as string) ?? key
}

function normalizeRecord(raw: Record<string, unknown>): RawUserRecord {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeFieldName(key)
    result[normalized] = typeof value === "string" ? value.trim() : value
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
