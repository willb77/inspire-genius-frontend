/**
 * RWO-8 §9 / §10 helpers: a role is sent only complete and without empty
 * fields; the posting text keeps the typed description whole within the cap.
 */
import { cleanRole, EMPTY_ROLE, roleLine, rolesForRequest, ROLES_MAX, type RoleDraft } from "../roles"
import { combinePosting, deletesOnLabel, positionCap, POSITION_MAX, POSITION_MAX_FEDERAL } from "../jobFile"
import type { ResumeOptionView } from "@/types/resumeWriter"

const role = (p: Partial<RoleDraft>): RoleDraft => ({ ...EMPTY_ROLE, bullets: ["", "", ""], ...p })

describe("cleanRole", () => {
  it("needs a title and an organization", () => {
    expect(cleanRole(role({ title: "CTO" }))).toBeNull()
    expect(cleanRole(role({ organization: "IBM" }))).toBeNull()
    expect(cleanRole(role({ title: "  ", organization: "IBM" }))).toBeNull()
  })
  it("drops empty fields, trims, and writes Present", () => {
    expect(cleanRole(role({ title: " CTO ", organization: " IBM ", present: true, end: "2020", bullets: [" a ", "", "b"] }))).toEqual({
      title: "CTO", organization: "IBM", end: "Present", bullets: ["a", "b"],
    })
    expect(cleanRole(role({ title: "CTO", organization: "IBM" }))).toEqual({ title: "CTO", organization: "IBM" })
  })
  it("caps lengths and bullets", () => {
    const r = cleanRole(role({ title: "t".repeat(200), organization: "o", start: "s".repeat(40), bullets: ["x".repeat(400), "y", "z", "w"] }))!
    expect(r.title).toHaveLength(120)
    expect(r.start).toHaveLength(20)
    expect(r.bullets).toHaveLength(3)
    expect(r.bullets![0]).toHaveLength(300)
  })
})

it("rolesForRequest drops incomplete roles and keeps at most five", () => {
  const many = Array.from({ length: 7 }, (_, i) => role({ title: `R${i}`, organization: "O" }))
  expect(rolesForRequest([role({ title: "x" }), ...many])).toHaveLength(ROLES_MAX)
  expect(rolesForRequest([role({ title: "x" })])).toEqual([])
})

it("roleLine", () => {
  expect(roleLine(role({ title: "Founder", organization: "Inspires Genius", start: "2019", present: true }))).toBe(
    "Founder, Inspires Genius · 2019 – Present",
  )
  expect(roleLine(role({ title: "CTO", organization: "IBM" }))).toBe("CTO, IBM")
})

describe("combinePosting", () => {
  it("nothing → null; one side → that side", () => {
    expect(combinePosting(" ", "", 100)).toBeNull()
    expect(combinePosting("typed", "", 100)).toEqual({ text: "typed", truncated: false })
    expect(combinePosting("", " file ", 100)).toEqual({ text: "file", truncated: false })
  })
  it("typed, blank line, file", () => {
    expect(combinePosting("typed", "file", 100)).toEqual({ text: "typed\n\nfile", truncated: false })
  })
  it("over the cap the file is cut and the typed text kept whole", () => {
    expect(combinePosting("typed", "0123456789", 12)).toEqual({ text: "typed\n\n01234", truncated: true })
  })
  it("typed text alone over the cap is cut to the cap", () => {
    expect(combinePosting("abcdefghij", "file", 4)).toEqual({ text: "abcd", truncated: true })
    expect(combinePosting("", "abcdefghij", 4)).toEqual({ text: "abcd", truncated: true })
  })
})

it("positionCap follows the server: Federal reads more", () => {
  expect(positionCap(undefined)).toBe(POSITION_MAX)
  expect(positionCap({ takesFederalDetails: true } as ResumeOptionView)).toBe(POSITION_MAX_FEDERAL)
})

it("deletesOnLabel", () => {
  expect(deletesOnLabel("2027-02-03T23:59:00Z")).toBe("Deletes on 3 Feb 2027")
  expect(deletesOnLabel(null)).toBeNull()
  expect(deletesOnLabel("not a date")).toBeNull()
})
