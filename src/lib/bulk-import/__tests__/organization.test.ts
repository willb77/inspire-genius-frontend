/**
 * Bulk Import's Organization column.
 *
 * Before this column existed the importer had no way to put anyone into an
 * organisation: an "Organization" header was dropped as unrecognised, and
 * every imported user landed in no organisation, to be fixed by hand one row
 * at a time on the Users page. The backend of the Skip-onboarding path already
 * took a per-row organization_id; nothing sent one.
 *
 * What these tests pin:
 *  - the header is read under its four spellings, and NOT under "Org" or
 *    "Company", which older files carry and must keep importing as before;
 *  - a name resolves to exactly one organisation, or the row says why not;
 *  - the standard path (no Skip onboarding) refuses the column instead of
 *    sending it to a backend that would drop it;
 *  - only a super-admin import acts on it;
 *  - a raw organization_id column cannot bypass the name check.
 */
import { parseCSV } from "@/lib/bulk-import/parsers"
import { revalidateRecord, validateRecords } from "@/lib/bulk-import/validation"
import { buildTemplateCsv, TEMPLATE_FILENAME, TEMPLATE_HEADERS } from "@/lib/bulk-import/template"
import type { RawUserRecord } from "@/types/bulk-import"

const DIRECTORY = [
  { id: "org-a-id", name: "test-org-a" },
  { id: "org-b-id", name: "Test Org B" },
  { id: "dup-1", name: "Twin" },
  { id: "dup-2", name: "twin " },
]
const ALLOWED = { orgDirectory: DIRECTORY, organizationAllowed: true }

const base: RawUserRecord = {
  fname: "Test",
  lname: "User",
  email1: "test.user@example.com",
  user_type: "user",
}

function csv(text: string): File {
  return new File([text], "import.csv", { type: "text/csv" })
}

describe("Organization header", () => {
  it.each(["Organization", "Organisation", "Organization Name", "organisation_name"])(
    "reads %s into the organization field",
    async (header) => {
      const records = await parseCSV(
        csv(`First Name,Last Name,Email,Role,${header}\nTest,User,test.user@example.com,user,test-org-a\n`),
      )
      expect(records[0].organization).toBe("test-org-a")
      expect(validateRecords(records, "super-admin", ALLOWED).ignoredColumns).toEqual([])
    },
  )

  it.each(["Org", "Company"])("leaves %s unmapped and reported as ignored, as before", async (header) => {
    const records = await parseCSV(
      csv(`First Name,Last Name,Email,Role,${header}\nTest,User,test.user@example.com,user,test-org-a\n`),
    )
    expect(records[0].organization).toBeUndefined()
    const result = validateRecords(records, "super-admin", ALLOWED)
    expect(result.ignoredColumns).toEqual([header])
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].record.organization_id).toBeUndefined()
  })
})

describe("resolving the organisation (super-admin, Skip onboarding)", () => {
  it("sets organization_id from an exact name", () => {
    const result = validateRecords([{ ...base, organization: "test-org-a" }], "super-admin", ALLOWED)
    expect(result.invalid).toEqual([])
    expect(result.valid[0].record.organization_id).toBe("org-a-id")
  })

  it("ignores case and spacing", () => {
    const result = validateRecords(
      [{ ...base, organization: "  test   org b " }],
      "super-admin",
      ALLOWED,
    )
    expect(result.valid[0].record.organization_id).toBe("org-b-id")
  })

  it("refuses a name no organisation has, naming it", () => {
    const result = validateRecords([{ ...base, organization: "test-org-c" }], "super-admin", ALLOWED)
    expect(result.valid).toEqual([])
    expect(result.invalid[0].errors).toEqual([
      expect.objectContaining({ field: "organization", message: expect.stringContaining('"test-org-c"') }),
    ])
  })

  it("refuses a name two organisations share rather than picking one", () => {
    const result = validateRecords([{ ...base, organization: "TWIN" }], "super-admin", ALLOWED)
    expect(result.valid).toEqual([])
    expect(result.invalid[0].errors[0]).toMatchObject({
      field: "organization",
      message: expect.stringContaining("2 organizations"),
    })
  })

  it("refuses while the organisation list is not loaded", () => {
    const result = validateRecords([{ ...base, organization: "test-org-a" }], "super-admin", {
      organizationAllowed: true,
    })
    expect(result.valid).toEqual([])
    expect(result.invalid[0].errors[0].message).toMatch(/has not loaded/)
  })

  it("leaves a blank organisation alone", () => {
    const result = validateRecords([{ ...base, organization: "  " }], "super-admin", ALLOWED)
    expect(result.invalid).toEqual([])
    expect(result.valid[0].record.organization_id).toBeUndefined()
  })

  it("never takes an id from the file", () => {
    const result = validateRecords([{ ...base, organization_id: "pasted-id" }], "super-admin", ALLOWED)
    expect(result.valid[0].record.organization_id).toBeUndefined()
  })

  it("revalidateRecord applies the same check", () => {
    expect(revalidateRecord({ ...base, organization: "nope" }, "super-admin", ALLOWED)).toEqual([
      expect.objectContaining({ field: "organization" }),
    ])
    expect(revalidateRecord({ ...base, organization: "test-org-a" }, "super-admin", ALLOWED)).toEqual([])
  })
})

describe("paths that cannot apply an organisation", () => {
  it("refuses the column on the standard path (no Skip onboarding)", () => {
    const result = validateRecords([{ ...base, organization: "test-org-a" }], "super-admin", {
      orgDirectory: DIRECTORY,
      organizationAllowed: false,
    })
    expect(result.valid).toEqual([])
    expect(result.invalid[0].errors[0].message).toMatch(/only with 'Skip onboarding/)
  })

  it("defaults to refusing when the caller does not say", () => {
    const result = validateRecords([{ ...base, organization: "test-org-a" }], "super-admin")
    expect(result.valid).toEqual([])
  })

  it.each(["manager", "company-admin"] as const)(
    "for a %s, ignores the column and says so, as before it existed",
    (role) => {
      const result = validateRecords([{ ...base, organization: "test-org-a" }], role, ALLOWED)
      expect(result.invalid).toEqual([])
      expect(result.valid[0].record.organization_id).toBeUndefined()
      expect(result.ignoredColumns).toEqual(["Organization"])
    },
  )
})

describe("template", () => {
  it("ships the Organization column, blank, and still validates cleanly", async () => {
    expect(TEMPLATE_HEADERS[TEMPLATE_HEADERS.length - 1]).toBe("Organization")
    const records = await parseCSV(new File([buildTemplateCsv()], TEMPLATE_FILENAME, { type: "text/csv" }))
    const result = validateRecords(records, "super-admin")
    expect(result.invalid).toEqual([])
    expect(result.ignoredColumns).toEqual([])
  })
})
