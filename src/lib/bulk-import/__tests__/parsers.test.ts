import * as XLSX from "xlsx"

import {
  parseCSV,
  parseExcel,
  parseJSON,
  parseFile,
  trimCell,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE,
} from "@/lib/bulk-import/parsers"
import { validateRecords } from "@/lib/bulk-import/validation"

function createMockFile(content: string, name: string, type: string): File {
  return new File([content], name, { type })
}

function createXlsxFile(rows: Record<string, unknown>[], name = "users.xlsx"): File {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1")
  const buf = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return new File([buf], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

// Characters `String.prototype.trim()` does NOT strip. A test that only uses
// ordinary spaces passes against the pre-fix code and proves nothing.
const ZWSP = "\u200B"
const ZWNJ = "\u200C"
const WORD_JOINER = "\u2060"
const SOFT_HYPHEN = "\u00AD"
const NBSP = "\u00A0"

describe("parsers", () => {
  describe("SUPPORTED_EXTENSIONS", () => {
    it("contains expected formats", () => {
      expect(SUPPORTED_EXTENSIONS).toContain("csv")
      expect(SUPPORTED_EXTENSIONS).toContain("json")
      expect(SUPPORTED_EXTENSIONS).toContain("xlsx")
      expect(SUPPORTED_EXTENSIONS).toContain("xml")
    })
  })

  describe("MAX_FILE_SIZE", () => {
    it("is 10MB", () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
    })
  })

  describe("parseCSV", () => {
    it("parses CSV text correctly", async () => {
      const csv = "fname,lname,email1,user_type\nJane,Smith,jane@co.com,user\nJohn,Doe,john@co.com,manager"
      const file = createMockFile(csv, "users.csv", "text/csv")
      const records = await parseCSV(file)

      expect(records).toHaveLength(2)
      expect(records[0]).toMatchObject({
        fname: "Jane",
        lname: "Smith",
        email1: "jane@co.com",
        user_type: "user",
      })
      expect(records[1]).toMatchObject({
        fname: "John",
        lname: "Doe",
        email1: "john@co.com",
        user_type: "manager",
      })
    })

    it("normalizes field name aliases via CSV header mapping", async () => {
      const csv = "first_name,last_name,email,role\nJane,Smith,jane@co.com,user"
      const file = createMockFile(csv, "users.csv", "text/csv")
      const records = await parseCSV(file)

      expect(records).toHaveLength(1)
      expect(records[0]).toMatchObject({
        fname: "Jane",
        lname: "Smith",
        email1: "jane@co.com",
        user_type: "user",
      })
    })
  })

  describe("parseJSON", () => {
    it("handles array format", async () => {
      const data = [
        { fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "user" },
      ]
      const file = createMockFile(JSON.stringify(data), "users.json", "application/json")
      const records = await parseJSON(file)

      expect(records).toHaveLength(1)
      expect(records[0]).toMatchObject({
        fname: "Jane",
        lname: "Smith",
        email1: "jane@co.com",
        user_type: "user",
      })
    })

    it("handles {users: [...]} format", async () => {
      const data = {
        users: [
          { fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "user" },
        ],
      }
      const file = createMockFile(JSON.stringify(data), "users.json", "application/json")
      const records = await parseJSON(file)

      expect(records).toHaveLength(1)
      expect(records[0]).toMatchObject({
        fname: "Jane",
        lname: "Smith",
        email1: "jane@co.com",
      })
    })

    it("rejects non-array data", async () => {
      const data = { name: "not an array" }
      const file = createMockFile(JSON.stringify(data), "users.json", "application/json")

      await expect(parseJSON(file)).rejects.toThrow()
    })
  })

  describe("parseFile", () => {
    it("throws for unsupported extensions", async () => {
      const file = createMockFile("data", "users.pdf", "application/pdf")

      await expect(parseFile(file)).rejects.toThrow()
    })

    it("routes .csv files to CSV parser", async () => {
      const csv = "fname,lname,email1,user_type\nJane,Smith,jane@co.com,user"
      const file = createMockFile(csv, "users.csv", "text/csv")
      const records = await parseFile(file)

      expect(records).toHaveLength(1)
      expect(records[0].fname).toBe("Jane")
    })

    it("routes .json files to JSON parser", async () => {
      const data = [{ fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "user" }]
      const file = createMockFile(JSON.stringify(data), "users.json", "application/json")
      const records = await parseFile(file)

      expect(records).toHaveLength(1)
      expect(records[0].fname).toBe("Jane")
    })
  })

  // Trailing/leading whitespace in an uploaded sheet must never reach
  // validation. Ordinary spaces were always trimmed; the invisible characters
  // below were not, and they are the ones that produce an "invalid email" on a
  // cell that looks perfectly clean on screen.
  describe("edge-whitespace trimming", () => {
    describe("trimCell", () => {
      it("strips ordinary leading/trailing whitespace", () => {
        expect(trimCell("  jane@co.com \t\n")).toBe("jane@co.com")
      })

      it.each([
        ["zero-width space", ZWSP],
        ["zero-width non-joiner", ZWNJ],
        ["word joiner", WORD_JOINER],
        ["soft hyphen", SOFT_HYPHEN],
        ["non-breaking space", NBSP],
      ])("strips %s from both ends", (_label, ch) => {
        expect(trimCell(`${ch}jane@co.com${ch}`)).toBe("jane@co.com")
      })

      it("strips a mixed run of visible and invisible padding", () => {
        expect(trimCell(` ${ZWSP} ${NBSP}jane@co.com${ZWSP}${SOFT_HYPHEN} `)).toBe("jane@co.com")
      })

      it("leaves interior characters alone — it trims ends, it does not rewrite", () => {
        expect(trimCell(` Mary${ZWSP}Jane `)).toBe(`Mary${ZWSP}Jane`)
        expect(trimCell("  Van  der  Berg  ")).toBe("Van  der  Berg")
      })

      it("collapses a padding-only cell to empty so optional fields stay optional", () => {
        expect(trimCell(`  ${ZWSP} ${NBSP} `)).toBe("")
      })
    })

    it("trims CSV values, including invisible padding", async () => {
      const csv =
        "fname,lname,email1,user_type\n" +
        `  Jane ,${ZWSP}Smith${ZWSP},${NBSP}jane@co.com${ZWSP},  user  `
      const records = await parseCSV(createMockFile(csv, "users.csv", "text/csv"))

      expect(records[0]).toMatchObject({
        fname: "Jane",
        lname: "Smith",
        email1: "jane@co.com",
        user_type: "user",
      })
    })

    it("trims CSV header names carrying invisible padding", async () => {
      const csv =
        `${ZWSP}First Name ,  Last Name${NBSP},${ZWSP} Email ,role${ZWSP}\n` +
        "Jane,Smith,jane@co.com,user"
      const records = await parseCSV(createMockFile(csv, "users.csv", "text/csv"))

      expect(records[0]).toMatchObject({
        fname: "Jane",
        lname: "Smith",
        email1: "jane@co.com",
        user_type: "user",
      })
    })

    it("trims Excel cell values and headers", async () => {
      const file = createXlsxFile([
        {
          [`${ZWSP}First Name `]: "  Jane ",
          "Last Name ": `${ZWSP}Smith${NBSP}`,
          " Email": `${NBSP}jane@co.com${ZWSP}`,
          role: "  user  ",
        },
      ])
      const records = await parseExcel(file)

      expect(records[0]).toMatchObject({
        fname: "Jane",
        lname: "Smith",
        email1: "jane@co.com",
        user_type: "user",
      })
    })

    it("leaves non-string Excel cells untouched", async () => {
      const file = createXlsxFile([
        { fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "user", employee_id: 4021 },
      ])
      const records = await parseExcel(file)

      expect((records[0] as Record<string, unknown>).employee_id).toBe(4021)
    })

    it("trims JSON values", async () => {
      const data = [
        {
          fname: `${ZWSP}Jane `,
          lname: " Smith",
          email1: `  jane@co.com${NBSP}`,
          user_type: " user ",
        },
      ]
      const records = await parseJSON(
        createMockFile(JSON.stringify(data), "users.json", "application/json"),
      )

      expect(records[0]).toMatchObject({
        fname: "Jane",
        lname: "Smith",
        email1: "jane@co.com",
        user_type: "user",
      })
    })

    it("a padded row now VALIDATES — the whole point of trimming at parse time", async () => {
      const csv =
        "fname,lname,email1,email2,user_type\n" +
        `  Jane ,${ZWSP}Smith ,${NBSP}jane@co.com${ZWSP},   ,  user  `
      const records = await parseCSV(createMockFile(csv, "users.csv", "text/csv"))
      const result = validateRecords(records, "super-admin")

      expect(result.invalid).toHaveLength(0)
      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].record.email1).toBe("jane@co.com")
    })

    it("catches duplicates that differ only by invisible padding", async () => {
      const csv =
        "fname,lname,email1,user_type\n" +
        "Jane,Smith,jane@co.com,user\n" +
        `John,Doe,${ZWSP} jane@co.com ,user`
      const records = await parseCSV(createMockFile(csv, "users.csv", "text/csv"))
      const result = validateRecords(records, "super-admin")

      expect(result.duplicates).toHaveLength(1)
      expect(result.duplicates[0]).toMatchObject({ row: 2, duplicateOf: 1 })
    })
  })
})
