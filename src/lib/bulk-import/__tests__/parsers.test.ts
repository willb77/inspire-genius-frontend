import {
  parseCSV,
  parseJSON,
  parseFile,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE,
} from "@/lib/bulk-import/parsers"

function createMockFile(content: string, name: string, type: string): File {
  return new File([content], name, { type })
}

describe("parsers", () => {
  describe("SUPPORTED_EXTENSIONS", () => {
    it("contains expected formats", () => {
      expect(SUPPORTED_EXTENSIONS).toContain(".csv")
      expect(SUPPORTED_EXTENSIONS).toContain(".json")
      expect(SUPPORTED_EXTENSIONS).toContain(".xlsx")
      expect(SUPPORTED_EXTENSIONS).toContain(".xml")
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
})
