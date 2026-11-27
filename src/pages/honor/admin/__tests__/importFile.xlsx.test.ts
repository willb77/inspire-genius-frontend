/**
 * D-20 PR-A — the Honor admin import (Coaches / Fellows -> Import) against the
 * SheetJS CE build we ship. Real .xlsx bytes through the real
 * `parseImportFile` entry that ImportModal calls; nothing mocked.
 */
import fs from "fs"
import path from "path"
import * as XLSX from "xlsx"

import { parseImportFile, xlsxTemplateBlob } from "@/pages/honor/admin/importFile"

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

function xlsxFromMatrix(rows: unknown[][], name = "import.xlsx"): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1")
  const buf = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return new File([buf], name, { type: XLSX_MIME })
}

// See src/lib/bulk-import/__tests__/parsers.xlsx.test.ts for how it was built.
const PP_FIXTURE = path.resolve(__dirname, "../../../../test/fixtures/xlsx/proto-pollution-comment.xlsx")

describe("Honor admin .xlsx import (SheetJS CE)", () => {
  afterEach(() => {
    delete (Object.prototype as Record<string, unknown>).c
  })

  it("parses a coach workbook: case-insensitive headers, unknown columns dropped, blank rows skipped", async () => {
    const file = xlsxFromMatrix([
      ["First_Name", "LAST_NAME", "Email", "Role", "Notes"],
      ["Jordan", "Morales", "jordan@example.com", "coach", "ignored"],
      [],
      ["Sam", "Lee", "sam@example.com", "lead coach", ""],
    ])

    const records = await parseImportFile(file, "coach")

    expect(records).toEqual([
      { first_name: "Jordan", last_name: "Morales", email: "jordan@example.com", role: "coach" },
      { first_name: "Sam", last_name: "Lee", email: "sam@example.com", role: "lead coach" },
    ])
  })

  it("parses a fellow workbook and stringifies non-text cells", async () => {
    const file = xlsxFromMatrix([
      ["first_name", "last_name", "email", "cohort"],
      ["Marcus", "Reyes", "marcus@example.com", "Cohort 2026-A"],
      ["Dana", "Kim", "dana@example.com", 2027],
    ])

    const records = await parseImportFile(file, "fellow")

    expect(records).toEqual([
      { first_name: "Marcus", last_name: "Reyes", email: "marcus@example.com", cohort: "Cohort 2026-A" },
      { first_name: "Dana", last_name: "Kim", email: "dana@example.com", cohort: "2027" },
    ])
  })

  it("accepts .xls (legacy BIFF8) through the same workbook path", async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["first_name", "last_name", "email", "cohort"],
      ["Marcus", "Reyes", "marcus@example.com", "Cohort 2026-A"],
    ])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Sheet1")
    const buf = XLSX.write(book, { type: "array", bookType: "biff8" }) as ArrayBuffer
    const file = new File([buf], "fellows.xls", { type: "application/vnd.ms-excel" })

    await expect(parseImportFile(file, "fellow")).resolves.toEqual([
      { first_name: "Marcus", last_name: "Reyes", email: "marcus@example.com", cohort: "Cohort 2026-A" },
    ])
  })

  it("round-trips the downloadable .xlsx template (write path) back through the importer", async () => {
    const blob = xlsxTemplateBlob("coach")
    const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(blob)
    })

    expect(XLSX.read(buf, { type: "array" }).SheetNames).toEqual(["Coaches"])

    const records = await parseImportFile(new File([buf], "template.xlsx", { type: XLSX_MIME }), "coach")
    expect(records).toEqual([
      { first_name: "Jordan", last_name: "Morales", email: "j.morales@honor.org", role: "coach" },
    ])
  })

  it("does not pollute Object.prototype when a comment is addressed to __proto__", async () => {
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "c")).toBe(false)

    const file = new File([fs.readFileSync(PP_FIXTURE)], "fellows.xlsx", { type: XLSX_MIME })
    const records = await parseImportFile(file, "fellow")

    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "c")).toBe(false)
    expect(({} as Record<string, unknown>).c).toBeUndefined()
    expect(records).toEqual([{ first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" }])
  })
})
