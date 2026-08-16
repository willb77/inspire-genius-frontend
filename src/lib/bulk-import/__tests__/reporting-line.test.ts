/**
 * The Manager column — header resolution and validation.
 *
 * This column is the only reason a manager's roster is ever non-empty: its
 * value becomes `employee_profiles.manager_id` server-side. Before 2026-08-16
 * the importer had no such column, so every bulk-imported user belonged to
 * nobody and every manager surface rendered blank while looking healthy.
 *
 * The subtle part is the collision with email inference. "Manager Email"
 * contains the word "email", and the parser infers unrecognised email-ish
 * headers into the user's OWN address slot. Resolving it to `manager_email`
 * instead — while still refusing "Parent Email" and friends — is the behaviour
 * these tests pin down. Getting it backwards would make a supervisor's address
 * somebody's login.
 */
import { mapHeaders } from "@/lib/bulk-import/parsers"
import { validateRecords, revalidateRecord } from "@/lib/bulk-import/validation"

function resolve(header: string): string | undefined {
  return mapHeaders([header]).resolved.get(header)
}

describe("Manager column header resolution", () => {
  it.each([
    "Manager",
    "Manager Email",
    "manager_email",
    "Reports To",
    "reports_to",
    "Supervisor",
    "Supervisor Email",
    "Line Manager",
  ])("resolves %s to manager_email", (header) => {
    expect(resolve(header)).toBe("manager_email")
  })

  it.each(["Department", "Dept", "Team", "Division"])(
    "resolves %s to department",
    (header) => {
      expect(resolve(header)).toBe("department")
    },
  )

  it.each(["Position", "Job Title", "Title"])("resolves %s to position", (header) => {
    expect(resolve(header)).toBe("position")
  })

  // The guard that must NOT regress: an email column naming somebody else is
  // still reported as ignored rather than becoming the user's own login.
  it.each(["Parent Email", "Guardian Email", "Counselor Email", "Emergency Contact Email"])(
    "still refuses to infer %s as the user's own address",
    (header) => {
      const { resolved, mapping } = mapHeaders([header])
      expect(resolved.get(header)).toBe(header)
      expect(mapping.ignored).toContain(header)
    },
  )

  it("keeps the user's own email separate from their manager's", () => {
    const { resolved } = mapHeaders(["Email", "Manager Email"])
    expect(resolved.get("Email")).toBe("email1")
    expect(resolved.get("Manager Email")).toBe("manager_email")
  })

  it("does not let the manager column claim the email1 slot when it comes first", () => {
    const { resolved } = mapHeaders(["Manager Email", "Student Email"])
    expect(resolved.get("Manager Email")).toBe("manager_email")
    expect(resolved.get("Student Email")).toBe("email1")
  })
})

describe("reporting-line validation", () => {
  const base = { fname: "Jane", lname: "Doe", email1: "jane@co.com", user_type: "user" }

  it("accepts a row with a valid manager email", () => {
    const result = validateRecords([{ ...base, manager_email: "boss@co.com" }], "super-admin")
    expect(result.invalid).toHaveLength(0)
    expect(result.valid[0].record.manager_email).toBe("boss@co.com")
  })

  it("accepts a row with no manager at all — the column is optional", () => {
    const result = validateRecords([base], "super-admin")
    expect(result.invalid).toHaveLength(0)
  })

  it("rejects a manager value that is not an email", () => {
    // A NAME is the tempting thing to type here and it cannot be resolved to
    // an account, so it must fail on a row the operator can see and fix.
    const result = validateRecords([{ ...base, manager_email: "Sam Rivera" }], "super-admin")
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0].errors.some((e) => e.field === "manager_email")).toBe(true)
  })

  it("rejects a self-referencing reporting line", () => {
    // Postgres accepts it — manager_id is just an FK — and the roster then
    // lists the person under themselves with no error anywhere.
    const result = validateRecords([{ ...base, manager_email: "jane@co.com" }], "super-admin")
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0].errors[0].message).toMatch(/cannot report to themselves/i)
  })

  it("compares self-reference case-insensitively", () => {
    const result = validateRecords([{ ...base, manager_email: "JANE@CO.COM" }], "super-admin")
    expect(result.invalid).toHaveLength(1)
  })

  it("applies the same self-reference rule on inline re-edit", () => {
    const errors = revalidateRecord({ ...base, manager_email: "jane@co.com" }, "super-admin")
    expect(errors.some((e) => e.field === "manager_email")).toBe(true)
  })

  it("leaves the role-escalation rule alone", () => {
    const result = validateRecords(
      [{ ...base, user_type: "super-admin", manager_email: "boss@co.com" }],
      "manager",
    )
    expect(result.invalid[0].errors.some((e) => e.field === "user_type")).toBe(true)
  })
})
