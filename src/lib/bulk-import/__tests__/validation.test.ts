import { validateRecords, revalidateRecord } from "@/lib/bulk-import/validation"

describe("validation", () => {
  describe("validateRecords", () => {
    it("validates valid records correctly", () => {
      const records = [
        { fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "user" },
        { fname: "John", lname: "Doe", email1: "john@co.com", user_type: "manager" },
      ]
      const result = validateRecords(records, "super-admin")

      expect(result.valid).toHaveLength(2)
      expect(result.invalid).toHaveLength(0)
    })

    it("catches missing required fields (fname, lname, email1)", () => {
      const records = [
        { fname: "", lname: "Smith", email1: "jane@co.com", user_type: "user" },
        { fname: "John", lname: "", email1: "john@co.com", user_type: "user" },
        { fname: "Bob", lname: "Jones", email1: "", user_type: "user" },
      ]
      const result = validateRecords(records, "super-admin")

      expect(result.invalid).toHaveLength(3)
      result.invalid.forEach((item) => {
        expect(item.errors.length).toBeGreaterThan(0)
      })
    })

    it("catches invalid email format", () => {
      const records = [
        { fname: "Jane", lname: "Smith", email1: "not-an-email", user_type: "user" },
        { fname: "John", lname: "Doe", email1: "also bad", user_type: "user" },
      ]
      const result = validateRecords(records, "super-admin")

      expect(result.invalid).toHaveLength(2)
      result.invalid.forEach((item) => {
        expect(item.errors.some((e) => /email/i.test(e.message))).toBe(true)
      })
    })

    it("catches invalid user_type", () => {
      const records = [
        { fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "god-mode" },
      ]
      const result = validateRecords(records, "super-admin")

      expect(result.invalid).toHaveLength(1)
      expect(result.invalid[0].errors.some((e) => /user_type|role|must be/i.test(e.message))).toBe(true)
    })

    it("detects duplicate email1 values", () => {
      const records = [
        { fname: "Jane", lname: "Smith", email1: "dupe@co.com", user_type: "user" },
        { fname: "John", lname: "Doe", email1: "dupe@co.com", user_type: "user" },
      ]
      const result = validateRecords(records, "super-admin")

      expect(result.duplicates.length).toBeGreaterThan(0)
      expect(result.duplicates[0].email).toBe("dupe@co.com")
    })

    it("role escalation: company-admin cannot create super-admin", () => {
      const records = [
        { fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "super-admin" },
      ]
      const result = validateRecords(records, "company-admin")

      expect(result.invalid).toHaveLength(1)
      expect(
        result.invalid[0].errors.some((e) => /company admin|cannot|super-admin/i.test(e.message))
      ).toBe(true)
    })

    it("role escalation: super-admin can create any role", () => {
      const records = [
        { fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "super-admin" },
        { fname: "John", lname: "Doe", email1: "john@co.com", user_type: "company-admin" },
        { fname: "Bob", lname: "Jones", email1: "bob@co.com", user_type: "user" },
        { fname: "Charlie", lname: "Lee", email1: "charlie@co.com", user_type: "manager" },
      ]
      const result = validateRecords(records, "super-admin")

      expect(result.valid).toHaveLength(4)
      expect(result.invalid).toHaveLength(0)
    })
  })

  describe("revalidateRecord", () => {
    it("returns errors for invalid record", () => {
      const record = { fname: "", lname: "", email1: "bad", user_type: "invalid" }
      const errors = revalidateRecord(record, "super-admin")

      expect(errors.length).toBeGreaterThan(0)
    })

    it("returns empty array for valid record", () => {
      const record = { fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "user" }
      const errors = revalidateRecord(record, "super-admin")

      expect(errors).toHaveLength(0)
    })
  })
})
