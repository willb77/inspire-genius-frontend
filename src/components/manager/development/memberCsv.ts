/**
 * The "Import a file" tab's CSV parse for the Studio's Add people dialog.
 * Kept out of the component module so that module exports components only.
 */
import type { MemberCreateInput } from "@/types/development"

/**
 * Split CSV text into records of cells, RFC 4180 style: a field in double
 * quotes may hold commas, line breaks and doubled quotes (`""` → `"`).
 * Unquoted input splits exactly as a plain comma split did. Every cell is
 * trimmed, and records with no content are dropped.
 */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let cell = ""
  let quoted = false
  const endCell = () => {
    record.push(cell.trim())
    cell = ""
  }
  const endRecord = () => {
    endCell()
    if (record.some((c) => c !== "")) records.push(record)
    record = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"' && cell.trim() === "") {
      cell = ""
      quoted = true
    } else if (ch === ",") {
      endCell()
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      endRecord()
    } else {
      cell += ch
    }
  }
  endRecord()
  return records
}

/** Parse a `name,email,title,department` CSV (optional header row). */
export function parseMemberCsv(text: string): MemberCreateInput[] {
  const records = parseCsvRecords(text)
  if (records.length === 0) return []
  const hasHeader = records[0].join(",").toLowerCase().replace(/\s/g, "").startsWith("name")
  const rows = hasHeader ? records.slice(1) : records
  return rows
    .map((cells) => {
      const [name, email, title, department] = cells
      return {
        name: name || "",
        email: email || undefined,
        title: title || undefined,
        department: department || undefined,
      } as MemberCreateInput
    })
    .filter((m) => m.name)
}
