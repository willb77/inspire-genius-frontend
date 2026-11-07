import { mapHeaders } from "@/lib/bulk-import/parsers"
import {
  DATE_OF_BIRTH_LABEL,
  resolveDateOfBirth,
  revalidateRecord,
  validateRecords,
} from "@/lib/bulk-import/validation"
import type { RawUserRecord } from "@/types/bulk-import"

// N-2: a Date of birth column is recorded only while the server allows roster
// age capture (the minor_consent switch); otherwise it is ignored and reported,
// exactly as an unknown column was before.

const row = (date_of_birth: unknown): RawUserRecord => ({
  fname: "First", lname: "Last", email1: "student@example.test", user_type: "user", date_of_birth,
})

const TODAY = new Date("2026-11-07T12:00:00Z")

describe("Date of birth column — capture OFF (today)", () => {
  it.each(["2011-04-09", "not a date", "", 40000])("never fails a row and is never carried (%p)", (value) => {
    const result = validateRecords([row(value)], "super-admin")
    expect(result.invalid).toHaveLength(0)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].record).not.toHaveProperty("date_of_birth")
  })

  it("is reported as an ignored column when it carries anything", () => {
    expect(validateRecords([row("2011-04-09")], "super-admin").ignoredColumns).toContain(DATE_OF_BIRTH_LABEL)
    expect(validateRecords([row("")], "super-admin").ignoredColumns).not.toContain(DATE_OF_BIRTH_LABEL)
  })
})

describe("Date of birth column — capture ON", () => {
  const on = { ageCaptureAllowed: true }

  it("keeps an ISO date and normalises a US one", () => {
    expect(resolveDateOfBirth(row("2011-04-09"), on, TODAY)).toEqual({ value: "2011-04-09" })
    expect(resolveDateOfBirth(row(" 4/9/2011 "), on, TODAY)).toEqual({ value: "2011-04-09" })
    const result = validateRecords([row("04/09/2011")], "company-admin", on)
    expect(result.valid[0].record.date_of_birth).toBe("2011-04-09")
    expect(result.ignoredColumns).not.toContain(DATE_OF_BIRTH_LABEL)
  })

  it.each([
    ["2010-02-30", "real date"],
    ["13/01/2010", "real date"],
    ["2011", "real date"],
    [40000, "real date"],
    ["2026-11-08", "future"],
    ["1899-12-31", "plausible"],
  ])("fails the row on %p", (value, phrase) => {
    const res = resolveDateOfBirth(row(value), on, TODAY)
    expect(res.value).toBeUndefined()
    expect(res.error).toContain(phrase)
  })

  it("a bad date is a visible row error, field date_of_birth", () => {
    const result = validateRecords([row("2010-02-30")], "super-admin", on)
    expect(result.valid).toHaveLength(0)
    expect(result.invalid[0].errors.map((e) => e.field)).toContain("date_of_birth")
    expect(revalidateRecord(row("2010-02-30"), "super-admin", on).map((e) => e.field)).toContain("date_of_birth")
  })

  it("an empty cell is simply absent", () => {
    const result = validateRecords([row("")], "super-admin", on)
    expect(result.valid[0].record).not.toHaveProperty("date_of_birth")
  })
})

describe("header mapping", () => {
  it.each(["Date of Birth", "DOB", "Birth Date", "birthdate"])("maps %p to date_of_birth", (header) => {
    expect(mapHeaders([header]).resolved.get(header)).toBe("date_of_birth")
  })

  it("a guardian's date of birth is not the student's", () => {
    const { resolved, mapping } = mapHeaders(["Guardian DOB", "Parent Date of Birth"])
    expect(resolved.get("Guardian DOB")).not.toBe("date_of_birth")
    expect(resolved.get("Parent Date of Birth")).not.toBe("date_of_birth")
    expect(mapping.ignored).toEqual(["Guardian DOB", "Parent Date of Birth"])
  })
})
