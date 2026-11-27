/**
 * D-20 PR-A — the admin bulk-import spreadsheet path against the SheetJS CE
 * build we actually ship (vendored 0.20.x tarball, see package.json).
 *
 * Every assertion goes through the real `parseFile` / `parseExcel` entry the
 * FileUploader uses (super-admin, company-admin and manager Bulk Import, and
 * House -> Add People), with real .xlsx bytes, not a mocked library.
 */
import fs from "fs"
import path from "path"
import * as XLSX from "xlsx"

import { parseExcel, parseFile } from "@/lib/bulk-import/parsers"

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** A real .xlsx built from a matrix (header row first), as a File. */
function xlsxFromMatrix(rows: unknown[][], name = "roster.xlsx"): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Roster")
  const buf = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return new File([buf], name, { type: XLSX_MIME })
}

/**
 * A workbook whose single cell comment is addressed to `__proto__`. That is the
 * GHSA-4r6h-8v6p-xvw6 / CVE-2023-30533 shape: SheetJS <= 0.19.2 looks the
 * comment's cell up as `sheet["__proto__"]`, gets Object.prototype back, and
 * writes `c = []` onto it. Built once by unzipping a SheetJS-written workbook
 * and rewriting `ref="A2"` to `ref="__proto__"` in xl/comments1.xml.
 */
const PP_FIXTURE = path.resolve(__dirname, "../../../test/fixtures/xlsx/proto-pollution-comment.xlsx")

function fixtureFile(): File {
  return new File([fs.readFileSync(PP_FIXTURE)], "roster.xlsx", { type: XLSX_MIME })
}

function semverAtLeast(version: string, min: [number, number, number]): boolean {
  const parts = version.split(".").map((p) => parseInt(p, 10))
  for (let i = 0; i < 3; i++) {
    const a = parts[i] ?? 0
    if (a !== min[i]) return a > min[i]
  }
  return true
}

describe("bulk-import .xlsx parsing (SheetJS CE)", () => {
  afterEach(() => {
    // If a regression ever pollutes the prototype, do not let it leak into
    // every later test in this worker.
    delete (Object.prototype as Record<string, unknown>).c
  })

  it("ships a SheetJS build with both advisories fixed (PP 0.19.3, ReDoS 0.20.2)", () => {
    expect(semverAtLeast(XLSX.version, [0, 20, 2])).toBe(true)
  })

  it("parses a five-row roster into five records with every column", async () => {
    const file = xlsxFromMatrix([
      ["First Name", "Last Name", "Email", "Role", "Department"],
      ["Ada", "Lovelace", "ada@example.com", "user", "Analytics"],
      ["Grace", "Hopper", "grace@example.com", "manager", "Systems"],
      ["Alan", "Turing", "alan@example.com", "user", "Research"],
      ["Katherine", "Johnson", "katherine@example.com", "user", "Flight"],
      ["Edsger", "Dijkstra", "edsger@example.com", "user", "Systems"],
    ])

    const records = await parseFile(file)

    expect(records).toHaveLength(5)
    expect(records.map((r) => [r.fname, r.lname, r.email1])).toEqual([
      ["Ada", "Lovelace", "ada@example.com"],
      ["Grace", "Hopper", "grace@example.com"],
      ["Alan", "Turing", "alan@example.com"],
      ["Katherine", "Johnson", "katherine@example.com"],
      ["Edsger", "Dijkstra", "edsger@example.com"],
    ])
    expect(records[1]).toMatchObject({ user_type: "manager" })
  })

  it("routes .xls through the same Excel parser (legacy BIFF8 bytes)", async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["first_name", "last_name", "email"],
      ["Ada", "Lovelace", "ada@example.com"],
      ["Grace", "Hopper", "grace@example.com"],
    ])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Sheet1")
    const buf = XLSX.write(book, { type: "array", bookType: "biff8" }) as ArrayBuffer
    const file = new File([buf], "roster.xls", { type: "application/vnd.ms-excel" })

    const records = await parseFile(file)

    expect(records.map((r) => [r.fname, r.lname, r.email1])).toEqual([
      ["Ada", "Lovelace", "ada@example.com"],
      ["Grace", "Hopper", "grace@example.com"],
    ])
  })

  it("keeps numeric cells as numbers and skips blank rows", async () => {
    const file = xlsxFromMatrix([
      ["first_name", "last_name", "email", "employee_id"],
      ["Ada", "Lovelace", "ada@example.com", 4021],
      [],
      ["Grace", "Hopper", "grace@example.com", 4022],
    ])

    const records = await parseExcel(file)

    expect(records).toHaveLength(2)
    expect((records[0] as Record<string, unknown>).employee_id).toBe(4021)
    expect((records[1] as Record<string, unknown>).employee_id).toBe(4022)
  })

  it("rejects a workbook with no sheets", async () => {
    const file = new File([new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0)])], "empty.xlsx", {
      type: XLSX_MIME,
    })
    await expect(parseExcel(file)).rejects.toThrow()
  })

  it("does not pollute Object.prototype when a comment is addressed to __proto__", async () => {
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "c")).toBe(false)

    const records = await parseFile(fixtureFile())

    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "c")).toBe(false)
    expect(({} as Record<string, unknown>).c).toBeUndefined()
    // The roster itself still parses — the bad comment is dropped, not the file.
    expect(records.map((r) => [r.fname, r.lname, r.email1])).toEqual([["Ada", "Lovelace", "ada@example.com"]])
  })
})
